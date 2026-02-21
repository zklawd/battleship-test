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
  const { socket, connected } = useSocket();
  const [screen, setScreen] = useState<Screen>('home');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string>('');
  
  // Battle state
  const [playerBoard, setPlayerBoard] = useState<Cell[][] | null>(null);
  const [playerShips, setPlayerShips] = useState<Ship[]>([]);
  const [opponentBoard, setOpponentBoard] = useState<Cell[][] | null>(null);
  const [opponentShips, setOpponentShips] = useState<Ship[]>([]);

  useEffect(() => {
    if (!socket) return;

    // Room created successfully
    socket.on('room-created', (data: { code: string }) => {
      console.log('Room created:', data.code);
      setRoomState({ code: data.code, playerCount: 1 });
      setScreen('room');
      setError('');
    });

    // Successfully joined a room
    socket.on('room-joined', (data: { code: string; playerCount: number }) => {
      console.log('Room joined:', data.code, 'players:', data.playerCount);
      setRoomState({ code: data.code, playerCount: data.playerCount });
      setScreen('room');
      setError('');
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
    socket.on('join-error', (data: { message: string }) => {
      console.error('Join error:', data.message);
      setError(data.message);
    });

    // Both players ready, transition to placement
    socket.on('start-placement', () => {
      console.log('Starting placement phase');
      setScreen('pvp-placement');
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('join-error');
      socket.off('start-placement');
    };
  }, [socket]);

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
  };

  const handleBackToHome = () => {
    setScreen('home');
    setError('');
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
          connected 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
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
          mode="ai"
          playerBoard={playerBoard}
          playerShips={playerShips}
          opponentBoard={opponentBoard || undefined}
          opponentShips={opponentShips}
          onGameEnd={(winner) => {
            console.log('Game ended, winner:', winner);
          }}
          onBackToHome={handleBackToHome}
        />
      )}
    </>
  );
}

export default App;
