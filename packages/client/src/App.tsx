import { useEffect, useState } from 'react';
import { useSocket } from './hooks/useSocket.ts';
import { HomeScreen } from './components/HomeScreen.tsx';
import { OnlineLobby } from './components/OnlineLobby.tsx';
import { RoomView } from './components/RoomView.tsx';
import { ShipPlacement } from './components/ShipPlacement.tsx';
import { BattlePhase } from './components/BattlePhase.tsx';
import { AIOpponent } from '@battleship/shared';
import type { Cell, Ship } from '@battleship/shared';

type Screen = 'home' | 'online-lobby' | 'room' | 'ai-placement' | 'pvp-placement' | 'battle';

interface RoomState {
  code: string;
  playerCount: number;
}

function App() {
  const { socket, connected, reconnecting, saveRoomCode, clearSession } = useSocket();
  const [screen, setScreen] = useState<Screen>('home');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string>('');
  
  // Battle state
  const [playerBoard, setPlayerBoard] = useState<Cell[][] | null>(null);
  const [playerShips, setPlayerShips] = useState<Ship[]>([]);
  const [opponentBoard, setOpponentBoard] = useState<Cell[][] | null>(null);
  const [opponentShips, setOpponentShips] = useState<Ship[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string>('');

  useEffect(() => {
    if (!socket) return;

    // Room created successfully
    socket.on('room-created', (data: { code: string; sessionId?: string }) => {
      console.log('Room created:', data.code);
      setRoomState({ code: data.code, playerCount: 1 });
      setScreen('room');
      setError('');
      saveRoomCode(data.code);
    });

    // Successfully joined a room
    socket.on('room-joined', (data: { code: string; sessionId?: string }) => {
      console.log('Room joined:', data.code);
      setRoomState({ code: data.code, playerCount: 2 });
      setScreen('room');
      setError('');
      saveRoomCode(data.code);
    });

    // Player joined the room
    socket.on('player-joined', (data: { playerCount: number }) => {
      console.log('Player joined, total players:', data.playerCount);
      setRoomState(prev => prev ? { ...prev, playerCount: data.playerCount } : null);
    });

    // Player left the room
    socket.on('player-left', (data: { playerCount: number }) => {
      console.log('Player left, remaining players:', data.playerCount);
      setRoomState(prev => prev ? { ...prev, playerCount: data.playerCount } : null);
    });

    // Error joining room
    socket.on('error', (data: { message: string }) => {
      console.error('Error:', data.message);
      setError(data.message);
    });

    // Both players ready, transition to placement
    socket.on('phase:placement', () => {
      console.log('Starting placement phase');
      setScreen('pvp-placement');
    });

    // Battle phase started
    socket.on('phase:battle', (data: { currentTurn: string; isYourTurn: boolean }) => {
      console.log('Battle phase started, your turn:', data.isYourTurn);
      setCurrentTurn(data.currentTurn);
      setScreen('battle');
    });

    // Reconnection successful - restore game state
    socket.on('reconnect-success', (data: {
      roomCode: string;
      phase: string;
      yourBoard: Cell[][];
      yourShips: Ship[];
      ready: boolean;
      currentTurn: string;
      isYourTurn: boolean;
      opponentShots: Array<{row: number; col: number; hit: boolean}>;
      playerShots: Array<{row: number; col: number; hit: boolean}>;
    }) => {
      console.log('Reconnected successfully, restoring game state:', data);
      setRoomState({ code: data.roomCode, playerCount: 2 });
      setPlayerBoard(data.yourBoard);
      setPlayerShips(data.yourShips);
      setCurrentTurn(data.currentTurn);
      
      // Restore opponent board with player shots
      const emptyBoard = Array(10).fill(null).map(() => 
        Array(10).fill(null).map(() => ({ ship: null, hit: false }))
      );
      data.playerShots.forEach(shot => {
        emptyBoard[shot.row][shot.col] = { ship: null, hit: true };
      });
      setOpponentBoard(emptyBoard);
      
      // Navigate to appropriate screen
      if (data.phase === 'waiting' || data.phase === 'placement') {
        setScreen(data.ready ? 'room' : 'pvp-placement');
      } else if (data.phase === 'battle') {
        setScreen('battle');
      }
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('error');
      socket.off('phase:placement');
      socket.off('phase:battle');
      socket.off('reconnect-success');
    };
  }, [socket, saveRoomCode]);

  const handlePlayAI = () => {
    setScreen('ai-placement');
  };

  const handlePlayOnline = () => {
    setScreen('online-lobby');
    setError('');
  };

  const handleCreateRoom = () => {
    if (socket && connected) {
      socket.emit('create-room');
    } else {
      setError('Not connected to server');
    }
  };

  const handleJoinRoom = (code: string) => {
    if (socket && connected) {
      socket.emit('join-room', { code });
    } else {
      setError('Not connected to server');
    }
  };

  const handleLeaveRoom = () => {
    if (socket && roomState) {
      socket.emit('leave-room', { code: roomState.code });
    }
    setRoomState(null);
    setScreen('online-lobby');
    setError('');
    clearSession();
  };

  const handleBackToHome = () => {
    setScreen('home');
    setError('');
    clearSession();
  };

  const handleAIPlacementReady = (board: Cell[][], ships: Ship[]) => {
    console.log('AI placement ready:', { board, ships });
    
    // Set player's board and ships
    setPlayerBoard(board);
    setPlayerShips(ships);
    
    // Create AI opponent and place its ships
    const ai = new AIOpponent();
    const aiPlacement = ai.placeShipsRandomly();
    setOpponentBoard(aiPlacement.board);
    setOpponentShips(aiPlacement.ships);
    
    // Start battle
    setScreen('battle');
  };

  const handlePvPPlacementReady = (board: Cell[][], ships: Ship[]) => {
    console.log('PvP placement ready:', { board, ships });
    if (socket && roomState) {
      // TODO: Send placement to server
      socket.emit('placement-ready', { code: roomState.code, board, ships });
    }
  };

  const handlePlacementCancel = () => {
    if (screen === 'ai-placement') {
      setScreen('home');
    } else if (screen === 'pvp-placement') {
      handleLeaveRoom();
    }
  };

  // Connection status indicator
  const ConnectionStatus = () => {
    if (screen === 'home') return null;
    
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium ${
          reconnecting
            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            : connected 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${reconnecting ? 'bg-yellow-500 animate-pulse' : connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{reconnecting ? 'Reconnecting...' : connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <ConnectionStatus />
      
      {screen === 'home' && (
        <HomeScreen
          onPlayAI={handlePlayAI}
          onPlayOnline={handlePlayOnline}
        />
      )}

      {screen === 'online-lobby' && (
        <OnlineLobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onBack={handleBackToHome}
          error={error}
        />
      )}

      {screen === 'room' && roomState && (
        <RoomView
          roomCode={roomState.code}
          playerCount={roomState.playerCount}
          onCancel={handleLeaveRoom}
        />
      )}

      {screen === 'ai-placement' && (
        <ShipPlacement
          mode="ai"
          onReady={handleAIPlacementReady}
          onCancel={handlePlacementCancel}
        />
      )}

      {screen === 'pvp-placement' && (
        <ShipPlacement
          mode="pvp"
          onReady={handlePvPPlacementReady}
          onCancel={handlePlacementCancel}
        />
      )}

      {screen === 'battle' && playerBoard && playerShips.length > 0 && (
        <BattlePhase
          mode={roomState ? 'pvp' : 'ai'}
          playerBoard={playerBoard}
          playerShips={playerShips}
          opponentBoard={opponentBoard || undefined}
          opponentShips={opponentShips}
          roomCode={roomState?.code}
          socket={socket}
          initialTurn={currentTurn}
          onGameEnd={(winner) => {
            console.log('Game ended, winner:', winner);
            clearSession();
          }}
          onBackToHome={handleBackToHome}
        />
      )}
    </>
  );
}

export default App;
