import { useState, useEffect } from 'react';
import { Cell, Ship, resolveShot, checkWin, AIOpponent, type ShotHistory } from '@battleship/shared';

interface BattlePhaseProps {
  mode: 'ai' | 'pvp';
  playerBoard: Cell[][];
  playerShips: Ship[];
  opponentBoard?: Cell[][]; // Only for AI mode
  opponentShips?: Ship[]; // Only for AI mode
  roomCode?: string; // Only for PvP mode
  socket?: any; // Only for PvP mode
  initialTurn?: string; // Only for PvP mode
  onGameEnd: (winner: 'player' | 'opponent') => void;
  onBackToHome: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: 'sunk' | 'info';
}

type GridView = 'player' | 'opponent';

export function BattlePhase({
  mode,
  playerBoard: initialPlayerBoard,
  playerShips: initialPlayerShips,
  opponentBoard: initialOpponentBoard,
  opponentShips: initialOpponentShips,
  roomCode,
  socket,
  initialTurn,
  onBackToHome
}: BattlePhaseProps) {
  // Game state
  const [playerBoard, setPlayerBoard] = useState(initialPlayerBoard);
  const [playerShips, setPlayerShips] = useState(initialPlayerShips);
  const [opponentBoard, setOpponentBoard] = useState(initialOpponentBoard || createEmptyBoard());
  const [opponentShips, setOpponentShips] = useState<Ship[]>(initialOpponentShips || []);
  const [isPlayerTurn, setIsPlayerTurn] = useState(initialTurn ? initialTurn === socket?.id : true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mobileView, setMobileView] = useState<GridView>('opponent');
  
  // Opponent disconnection state
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [disconnectCountdown, setDisconnectCountdown] = useState(60);
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);
  
  // AI state (only for AI mode)
  const [aiOpponent] = useState(() => mode === 'ai' ? new AIOpponent() : null);
  const [aiShotHistory, setAiShotHistory] = useState<ShotHistory[]>([]);

  useEffect(() => {
    if (mode === 'pvp' && socket) {
      // Set up PvP socket listeners
      socket.on('shot-result', handleOpponentShot);
      socket.on('opponent-shot', handleOpponentShot);
      socket.on('game-over', handlePvPGameOver);
      socket.on('turn-changed', handleTurnChange);
      socket.on('opponent-disconnected', handleOpponentDisconnected);
      socket.on('opponent-reconnected', handleOpponentReconnected);
      
      return () => {
        socket.off('shot-result');
        socket.off('opponent-shot');
        socket.off('game-over');
        socket.off('turn-changed');
        socket.off('opponent-disconnected');
        socket.off('opponent-reconnected');
      };
    }
  }, [mode, socket]);

  // Countdown timer for opponent disconnection
  useEffect(() => {
    if (opponentDisconnected && disconnectCountdown > 0) {
      const timer = setTimeout(() => {
        setDisconnectCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (opponentDisconnected && disconnectCountdown === 0) {
      // Countdown expired, opponent forfeited
      setDisconnectReason('Opponent forfeited');
      endGame('player');
    }
  }, [opponentDisconnected, disconnectCountdown]);

  function createEmptyBoard(): Cell[][] {
    const board: Cell[][] = [];
    for (let row = 0; row < 10; row++) {
      board[row] = [];
      for (let col = 0; col < 10; col++) {
        board[row][col] = { ship: null, hit: false };
      }
    }
    return board;
  }

  function handleOpponentShot(data: { row: number; col: number; hit: boolean; sunk: boolean; shipName?: string }) {
    // Update player's own board based on opponent's shot
    const { result, board: newBoard, ships: newShips } = resolveShot(
      playerBoard,
      playerShips,
      data.row,
      data.col
    );

    setPlayerBoard(newBoard);
    setPlayerShips(newShips);

    if (result.sunk && result.shipName) {
      showToast(`Your ${result.shipName} was sunk!`, 'sunk');
    }

    // Check if player lost
    if (checkWin(newShips)) {
      endGame('opponent');
    }
  }

  function handlePvPGameOver(data: { winner: string; reason?: string }) {
    if (data.reason === 'opponent-forfeit') {
      setDisconnectReason('You win! Opponent forfeited');
    }
    endGame(data.winner === socket.id ? 'player' : 'opponent');
  }

  function handleTurnChange(data: { currentTurn: string; isYourTurn: boolean }) {
    setIsPlayerTurn(data.isYourTurn);
  }

  function handleOpponentDisconnected(data: { disconnectTime: number }) {
    console.log('Opponent disconnected at:', data.disconnectTime);
    setOpponentDisconnected(true);
    setDisconnectCountdown(60);
  }

  function handleOpponentReconnected() {
    console.log('Opponent reconnected');
    setOpponentDisconnected(false);
    setDisconnectCountdown(60);
    showToast('Opponent reconnected', 'info');
  }

  function handleCellClick(row: number, col: number) {
    // Don't allow clicks during opponent turn, game over, or on already-hit cells
    if (!isPlayerTurn || gameOver || opponentBoard[row][col].hit) {
      return;
    }

    if (mode === 'ai') {
      handleAIShot(row, col);
    } else {
      handlePvPShot(row, col);
    }
  }

  function handleAIShot(row: number, col: number) {
    // Resolve player's shot on AI board
    const { result, board: newOpponentBoard, ships: newOpponentShips } = resolveShot(
      opponentBoard,
      opponentShips,
      row,
      col
    );

    if (result.alreadyFired) return;

    setOpponentBoard(newOpponentBoard);
    setOpponentShips(newOpponentShips);

    if (result.sunk && result.shipName) {
      showToast(`${result.shipName} Sunk!`, 'sunk');
    }

    // Check if player won
    if (checkWin(newOpponentShips)) {
      endGame('player');
      return;
    }

    // Switch turn to AI
    setIsPlayerTurn(false);

    // AI takes its turn after a delay
    setTimeout(() => {
      if (aiOpponent) {
        const aiShot = aiOpponent.getNextShot(aiShotHistory);
        
        const { result: aiResult, board: newPlayerBoard, ships: newPlayerShips } = resolveShot(
          playerBoard,
          playerShips,
          aiShot.row,
          aiShot.col
        );

        // Update AI shot history
        const newShotHistory: ShotHistory[] = [
          ...aiShotHistory,
          {
            row: aiShot.row,
            col: aiShot.col,
            hit: aiResult.hit,
            sunk: aiResult.sunk
          }
        ];
        setAiShotHistory(newShotHistory);

        setPlayerBoard(newPlayerBoard);
        setPlayerShips(newPlayerShips);

        if (aiResult.sunk && aiResult.shipName) {
          showToast(`Your ${aiResult.shipName} was sunk!`, 'sunk');
        }

        // Check if AI won
        if (checkWin(newPlayerShips)) {
          endGame('opponent');
          return;
        }

        // Return turn to player
        setIsPlayerTurn(true);
      }
    }, 500 + Math.random() * 500); // 500-1000ms delay
  }

  function handlePvPShot(row: number, col: number) {
    if (socket && roomCode) {
      // Emit shot to server
      socket.emit('fire', { row, col });
      
      // Server will respond with shot-result event
      socket.once('shot-result', (data: { hit: boolean; sunk: boolean; shipName?: string }) => {
        // Update opponent board
        const newBoard = opponentBoard.map((r, rIdx) =>
          r.map((cell, cIdx) => {
            if (rIdx === row && cIdx === col) {
              return { ...cell, hit: true };
            }
            return cell;
          })
        );
        setOpponentBoard(newBoard);

        if (data.sunk && data.shipName) {
          showToast(`${data.shipName} Sunk!`, 'sunk');
        }

        // Turn will be managed by turn-changed event
      });
    }
  }

  function showToast(message: string, type: 'sunk' | 'info') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }

  function endGame(gameWinner: 'player' | 'opponent') {
    setGameOver(true);
    setWinner(gameWinner);
  }

  function renderGrid(board: Cell[][], _ships: Ship[], isOpponent: boolean) {
    return (
      <div className="inline-block bg-gray-800/50 p-2 sm:p-4 rounded-lg border border-gray-700 max-w-full">
        <div className="grid grid-cols-10 gap-0.5 sm:gap-1">
          {board.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const isHit = cell.hit;
              const hasShip = cell.ship !== null;
              const showShip = !isOpponent || gameOver; // Show ships on player board or when game is over
              
              let bgColor = 'bg-blue-600/30 hover:bg-blue-500/40 active:bg-blue-600/60';
              let content = null;
              let cursor = 'cursor-default';

              // Show ships (only if not opponent's board, or if game is over)
              if (showShip && hasShip && !isHit) {
                bgColor = 'bg-gray-500';
              }

              // Show hits
              if (isHit) {
                if (hasShip) {
                  // Hit
                  bgColor = 'bg-red-600';
                  content = (
                    <div className="text-white font-bold text-base sm:text-lg" aria-label="Hit">
                      ✕
                    </div>
                  );
                } else {
                  // Miss
                  bgColor = 'bg-gray-400';
                  content = (
                    <div className="text-white font-bold text-base sm:text-lg" aria-label="Miss">
                      ○
                    </div>
                  );
                }
              }

              // Clickable if opponent board, player's turn, not hit, and game not over
              const isClickable = isOpponent && isPlayerTurn && !isHit && !gameOver;
              if (isClickable) {
                cursor = 'cursor-pointer';
              }

              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`${bgColor} ${cursor} border border-gray-600 flex items-center justify-center transition-colors duration-150 rounded touch-manipulation`}
                  style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px' }}
                  onClick={() => isOpponent && handleCellClick(rowIdx, colIdx)}
                  role={isClickable ? 'button' : undefined}
                  aria-label={isClickable ? `Fire at row ${rowIdx + 1}, column ${colIdx + 1}` : undefined}
                >
                  {content}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderShipStatus(ships: Ship[], title: string) {
    return (
      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <h3 className="text-sm font-semibold mb-3 text-gray-300">{title}</h3>
        <div className="space-y-2">
          {ships.map(ship => (
            <div
              key={ship.id}
              className={`flex items-center gap-2 text-sm ${
                ship.sunk ? 'text-red-400 line-through' : 'text-gray-300'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${ship.sunk ? 'bg-red-500' : 'bg-green-500'}`} />
              <span>{ship.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (gameOver && winner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-900 text-white flex items-center justify-center p-4">
        <div className="max-w-6xl w-full">
          <div className="text-center mb-8">
            <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${
              winner === 'player' ? 'text-green-400' : 'text-red-400'
            }`}>
              {winner === 'player' ? '🎉 Victory!' : '💥 Defeat'}
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              {disconnectReason || (winner === 'player' ? 'You sank all enemy ships!' : 'All your ships have been sunk!')}
            </p>
          </div>

          {/* Show both boards */}
          <div className="flex flex-col lg:flex-row gap-8 justify-center items-start mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-4 text-center">Your Board</h2>
              {renderGrid(playerBoard, playerShips, false)}
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-4 text-center">Opponent Board</h2>
              {renderGrid(opponentBoard, opponentShips, false)}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={onBackToHome}
              className="bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-bold py-3 px-8 rounded-lg transition touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-900 text-white p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold">Battle Phase</h1>
          {mode === 'pvp' && roomCode && (
            <div className="text-sm text-gray-400">
              Room: <span className="font-mono text-white">{roomCode}</span>
            </div>
          )}
        </div>
        
        {/* Opponent disconnection warning */}
        {opponentDisconnected && (
          <div className="mb-4 p-4 bg-yellow-500/20 border-2 border-yellow-500 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span className="text-yellow-400 font-semibold">Opponent disconnected</span>
                </div>
                <span className="text-gray-300">- waiting</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-2xl font-bold font-mono text-yellow-400">{disconnectCountdown}s</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Turn indicator */}
        {!opponentDisconnected && (
          <div className="text-center py-3 rounded-lg border-2 border-dashed" 
            style={{
              borderColor: isPlayerTurn ? '#22c55e' : '#ef4444',
              backgroundColor: isPlayerTurn ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
            }}
          >
            <p className="text-lg font-semibold" style={{ color: isPlayerTurn ? '#22c55e' : '#ef4444' }}>
              {isPlayerTurn ? '🎯 Your Turn' : '⏳ Opponent\'s Turn'}
            </p>
          </div>
        )}
      </div>

      {/* Mobile view tabs (only on small screens) */}
      <div className="md:hidden max-w-6xl mx-auto mb-4">
        <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg border border-gray-700">
          <button
            onClick={() => setMobileView('opponent')}
            className={`flex-1 py-3 px-4 rounded transition font-semibold touch-manipulation ${
              mobileView === 'opponent'
                ? 'bg-blue-600 text-white'
                : 'bg-transparent text-gray-400 hover:text-white active:bg-gray-700/50'
            }`}
            style={{ minHeight: '44px' }}
          >
            Enemy Board
          </button>
          <button
            onClick={() => setMobileView('player')}
            className={`flex-1 py-3 px-4 rounded transition font-semibold touch-manipulation ${
              mobileView === 'player'
                ? 'bg-blue-600 text-white'
                : 'bg-transparent text-gray-400 hover:text-white active:bg-gray-700/50'
            }`}
            style={{ minHeight: '44px' }}
          >
            My Board
          </button>
        </div>
      </div>

      {/* Grids */}
      <div className="max-w-6xl mx-auto">
        {/* Desktop: side by side */}
        <div className="hidden md:flex gap-8 justify-center items-start">
          <div className="flex-1 max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-center">Your Board</h2>
            {renderGrid(playerBoard, playerShips, false)}
            <div className="mt-4">
              {renderShipStatus(playerShips, 'Your Fleet')}
            </div>
          </div>
          
          <div className="flex-1 max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-center">Opponent Board</h2>
            {renderGrid(opponentBoard, opponentShips, true)}
            <div className="mt-4">
              {renderShipStatus(opponentShips, 'Enemy Fleet')}
            </div>
          </div>
        </div>

        {/* Mobile: tabbed view */}
        <div className="md:hidden flex flex-col items-center">
          {mobileView === 'player' ? (
            <>
              <h2 className="text-xl font-semibold mb-4">Your Board</h2>
              {renderGrid(playerBoard, playerShips, false)}
              <div className="mt-4 w-full max-w-sm">
                {renderShipStatus(playerShips, 'Your Fleet')}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-4">Opponent Board</h2>
              {renderGrid(opponentBoard, opponentShips, true)}
              <div className="mt-4 w-full max-w-sm">
                {renderShipStatus(opponentShips, 'Enemy Fleet')}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-lg shadow-lg border-2 animate-slide-in ${
              toast.type === 'sunk'
                ? 'bg-red-500/90 border-red-300 text-white'
                : 'bg-blue-500/90 border-blue-300 text-white'
            }`}
          >
            <p className="font-semibold">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
