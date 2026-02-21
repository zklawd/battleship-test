import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import crypto from 'crypto';
import {
  BOARD_SIZE,
  SHIPS,
  createBoard,
  placeShip,
  resolveShot,
  checkWin,
  type Cell,
  type Ship,
  type Player,
  type Room,
  type Orientation
} from '@battleship/shared';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage
const rooms = new Map<string, Room>();
const playerToRoom = new Map<string, string>(); // socketId -> roomCode
const disconnectedPlayers = new Map<string, NodeJS.Timeout>(); // socketId -> timeout

// Constants
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const RECONNECT_TIMEOUT_MS = 60 * 1000; // 60 seconds

/**
 * Generate a cryptographically random 6-character alphanumeric room code
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  // Generate 6 random bytes (we need 6 chars)
  const randomBytes = crypto.randomBytes(6);
  
  for (let i = 0; i < 6; i++) {
    // Use random byte to select from chars array
    code += chars[randomBytes[i] % chars.length];
  }
  
  // Ensure uniqueness
  if (rooms.has(code)) {
    return generateRoomCode(); // Recursively generate new code
  }
  
  return code;
}

/**
 * Create a new player object
 */
function createPlayer(socketId: string): Player {
  return {
    socketId,
    board: createBoard(),
    ships: [],
    ready: false
  };
}

/**
 * Clean up idle rooms
 */
function checkIdleRooms() {
  const now = Date.now();
  
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivity > IDLE_TIMEOUT_MS) {
      console.log(`Room ${code} idle for >10 minutes, closing...`);
      
      // Notify all players
      for (const player of room.players) {
        io.to(player.socketId).emit('room-closed', {
          reason: 'Room was idle for 10 minutes'
        });
        playerToRoom.delete(player.socketId);
      }
      
      rooms.delete(code);
    }
  }
}

// Check for idle rooms every minute
setInterval(checkIdleRooms, 60 * 1000);

/**
 * Update room activity timestamp
 */
function updateRoomActivity(roomCode: string) {
  const room = rooms.get(roomCode);
  if (room) {
    room.lastActivity = Date.now();
  }
}

/**
 * Get opponent socket ID
 */
function getOpponent(room: Room, socketId: string): Player | null {
  return room.players.find(p => p.socketId !== socketId) || null;
}

/**
 * Handle player disconnection
 */
function handleDisconnect(socket: Socket) {
  const roomCode = playerToRoom.get(socket.id);
  
  if (!roomCode) return;
  
  const room = rooms.get(roomCode);
  if (!room) return;
  
  console.log(`Player ${socket.id} disconnected from room ${roomCode}`);
  
  const opponent = getOpponent(room, socket.id);
  
  if (opponent) {
    // Notify opponent
    io.to(opponent.socketId).emit('opponent-disconnected');
    
    // Start reconnect timer
    const timeout = setTimeout(() => {
      console.log(`Player ${socket.id} did not reconnect, forfeiting game`);
      
      // Forfeit the game
      room.phase = 'finished';
      io.to(opponent.socketId).emit('game-over', {
        winner: opponent.socketId,
        reason: 'opponent-disconnect'
      });
      
      // Clean up
      disconnectedPlayers.delete(socket.id);
      playerToRoom.delete(socket.id);
      
      // Remove disconnected player from room
      room.players = room.players.filter(p => p.socketId !== socket.id);
      
      // If room is empty, delete it
      if (room.players.length === 0) {
        rooms.delete(roomCode);
      }
    }, RECONNECT_TIMEOUT_MS);
    
    disconnectedPlayers.set(socket.id, timeout);
  } else {
    // No opponent, just remove the room
    rooms.delete(roomCode);
    playerToRoom.delete(socket.id);
  }
}

/**
 * Handle player reconnection
 */
function handleReconnect(socket: Socket, roomCode: string) {
  const timeout = disconnectedPlayers.get(socket.id);
  
  if (timeout) {
    clearTimeout(timeout);
    disconnectedPlayers.delete(socket.id);
    
    const room = rooms.get(roomCode);
    if (room) {
      const opponent = getOpponent(room, socket.id);
      if (opponent) {
        io.to(opponent.socketId).emit('opponent-reconnected');
      }
      
      // Send current game state to reconnected player
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        socket.emit('game-state', {
          phase: room.phase,
          yourBoard: player.board,
          yourShips: player.ships,
          ready: player.ready,
          currentTurn: room.currentTurn,
          isYourTurn: room.currentTurn === socket.id
        });
      }
    }
  }
}

app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    boardSize: BOARD_SIZE, 
    ships: SHIPS,
    activeRooms: rooms.size
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  /**
   * Create a new room
   */
  socket.on('create-room', () => {
    const code = generateRoomCode();
    const player = createPlayer(socket.id);
    
    const room: Room = {
      code,
      players: [player],
      phase: 'waiting',
      currentTurn: '',
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    rooms.set(code, room);
    playerToRoom.set(socket.id, code);
    
    socket.join(code);
    socket.emit('room-created', { code });
    
    console.log(`Room ${code} created by ${socket.id}`);
  });

  /**
   * Join an existing room
   */
  socket.on('join-room', (data: { code: string }) => {
    const { code } = data;
    
    if (!code) {
      socket.emit('error', { message: 'Room code is required' });
      return;
    }
    
    const room = rooms.get(code.toUpperCase());
    
    if (!room) {
      socket.emit('error', { message: 'Invalid room code' });
      return;
    }
    
    if (room.players.length >= 2) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    const player = createPlayer(socket.id);
    room.players.push(player);
    playerToRoom.set(socket.id, code.toUpperCase());
    updateRoomActivity(code.toUpperCase());
    
    socket.join(code.toUpperCase());
    socket.emit('room-joined', { code: code.toUpperCase() });
    
    console.log(`Player ${socket.id} joined room ${code.toUpperCase()}`);
    
    // Both players are now in the room, start placement phase
    if (room.players.length === 2) {
      room.phase = 'placement';
      io.to(code.toUpperCase()).emit('phase:placement');
      console.log(`Room ${code.toUpperCase()} entering placement phase`);
    }
  });

  /**
   * Place ships
   */
  socket.on('place-ships', (data: {
    placements: Array<{
      ship: { name: string; size: number };
      row: number;
      col: number;
      orientation: Orientation;
    }>
  }) => {
    const roomCode = playerToRoom.get(socket.id);
    
    if (!roomCode) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }
    
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.phase !== 'placement') {
      socket.emit('error', { message: 'Not in placement phase' });
      return;
    }
    
    const player = room.players.find(p => p.socketId === socket.id);
    
    if (!player) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }
    
    // Validate placements
    let board = createBoard();
    const ships: Ship[] = [];
    
    try {
      for (const placement of data.placements) {
        const result = placeShip(
          board,
          placement.ship,
          placement.row,
          placement.col,
          placement.orientation
        );
        
        if (!result.valid) {
          socket.emit('error', { message: `Invalid placement: ${result.error}` });
          return;
        }
        
        board = result.board;
        ships.push(result.ship);
      }
      
      // Verify all ships are placed
      if (ships.length !== SHIPS.length) {
        socket.emit('error', { message: 'Not all ships were placed' });
        return;
      }
      
      // Update player
      player.board = board;
      player.ships = ships;
      player.ready = true;
      
      updateRoomActivity(roomCode);
      
      socket.emit('placement-confirmed');
      
      console.log(`Player ${socket.id} placed ships in room ${roomCode}`);
      
      // Check if both players are ready
      if (room.players.every(p => p.ready)) {
        // Randomly choose who goes first
        const firstPlayer = room.players[Math.random() < 0.5 ? 0 : 1];
        room.currentTurn = firstPlayer.socketId;
        room.phase = 'battle';
        
        // Notify both players
        for (const p of room.players) {
          io.to(p.socketId).emit('phase:battle', {
            currentTurn: room.currentTurn,
            isYourTurn: p.socketId === room.currentTurn
          });
        }
        
        console.log(`Room ${roomCode} entering battle phase, first turn: ${room.currentTurn}`);
      }
    } catch (error) {
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Placement failed' 
      });
    }
  });

  /**
   * Fire a shot
   */
  socket.on('fire', (data: { row: number; col: number }) => {
    const roomCode = playerToRoom.get(socket.id);
    
    if (!roomCode) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }
    
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.phase !== 'battle') {
      socket.emit('error', { message: 'Not in battle phase' });
      return;
    }
    
    if (room.currentTurn !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    const opponent = getOpponent(room, socket.id);
    
    if (!opponent) {
      socket.emit('error', { message: 'Opponent not found' });
      return;
    }
    
    updateRoomActivity(roomCode);
    
    try {
      // Resolve the shot on opponent's board
      const { result, board, ships } = resolveShot(
        opponent.board,
        opponent.ships,
        data.row,
        data.col
      );
      
      if (result.alreadyFired) {
        socket.emit('error', { message: 'Already fired at this cell' });
        return;
      }
      
      // Update opponent's board and ships
      opponent.board = board;
      opponent.ships = ships;
      
      // Broadcast the result to both players
      // To the shooter (don't include opponent's ship positions)
      socket.emit('shot-result', {
        row: data.row,
        col: data.col,
        hit: result.hit,
        sunk: result.sunk,
        shipName: result.shipName
      });
      
      // To the opponent (include their own board update)
      io.to(opponent.socketId).emit('opponent-shot', {
        row: data.row,
        col: data.col,
        hit: result.hit,
        sunk: result.sunk,
        shipName: result.shipName
      });
      
      console.log(`Shot at (${data.row}, ${data.col}) - Hit: ${result.hit}, Sunk: ${result.sunk}`);
      
      // Check for win condition
      if (checkWin(opponent.ships)) {
        room.phase = 'finished';
        
        io.to(socket.id).emit('game-over', {
          winner: socket.id,
          reason: 'all-ships-sunk'
        });
        
        io.to(opponent.socketId).emit('game-over', {
          winner: socket.id,
          reason: 'all-ships-sunk'
        });
        
        console.log(`Game over in room ${roomCode}, winner: ${socket.id}`);
      } else {
        // Switch turns
        room.currentTurn = opponent.socketId;
        
        io.to(socket.id).emit('turn-changed', {
          currentTurn: room.currentTurn,
          isYourTurn: false
        });
        
        io.to(opponent.socketId).emit('turn-changed', {
          currentTurn: room.currentTurn,
          isYourTurn: true
        });
      }
    } catch (error) {
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Shot failed' 
      });
    }
  });

  /**
   * Handle disconnection
   */
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    handleDisconnect(socket);
  });

  /**
   * Handle reconnection attempt
   */
  socket.on('reconnect-to-room', (data: { code: string }) => {
    const { code } = data;
    
    if (!code) {
      socket.emit('error', { message: 'Room code is required' });
      return;
    }
    
    handleReconnect(socket, code.toUpperCase());
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚢 Battleship server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
