import { useState, useEffect } from 'react';
import { SHIPS, BOARD_SIZE, createBoard, placeShip, type Orientation, type Cell, type Ship } from '@battleship/shared';

interface ShipPlacementProps {
  mode: 'ai' | 'pvp';
  onReady: (board: Cell[][], ships: Ship[]) => void;
  onCancel: () => void;
}

interface ShipInRoster {
  name: string;
  size: number;
  placed: boolean;
}

export function ShipPlacement({ mode, onReady, onCancel }: ShipPlacementProps) {
  const [board, setBoard] = useState<Cell[][]>(createBoard());
  const [placedShips, setPlacedShips] = useState<Ship[]>([]);
  const [roster, setRoster] = useState<ShipInRoster[]>(
    SHIPS.map(ship => ({ ...ship, placed: false }))
  );
  const [selectedShip, setSelectedShip] = useState<ShipInRoster | null>(null);
  const [orientation, setOrientation] = useState<Orientation>('horizontal');
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [invalidPlacement, setInvalidPlacement] = useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        toggleOrientation();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const toggleOrientation = () => {
    setOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
  };

  const selectShip = (ship: ShipInRoster) => {
    if (ship.placed) return;
    setSelectedShip(ship);
    setInvalidPlacement(false);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!selectedShip) return;

    const result = placeShip(board, selectedShip, row, col, orientation);
    
    if (result.valid) {
      setBoard(result.board);
      setPlacedShips([...placedShips, result.ship]);
      setRoster(roster.map(s => 
        s.name === selectedShip.name ? { ...s, placed: true } : s
      ));
      setSelectedShip(null);
      setInvalidPlacement(false);
    } else {
      setInvalidPlacement(true);
      setTimeout(() => setInvalidPlacement(false), 500);
    }
  };

  const getPreviewCells = (row: number, col: number): [number, number][] => {
    if (!selectedShip) return [];
    
    const cells: [number, number][] = [];
    for (let i = 0; i < selectedShip.size; i++) {
      const r = orientation === 'vertical' ? row + i : row;
      const c = orientation === 'horizontal' ? col + i : col;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        cells.push([r, c]);
      }
    }
    return cells;
  };

  const isPreviewValid = (row: number, col: number): boolean => {
    if (!selectedShip) return true;
    
    const result = placeShip(board, selectedShip, row, col, orientation);
    return result.valid;
  };

  const handleRandomPlacement = () => {
    let newBoard = createBoard();
    const newShips: Ship[] = [];
    const orientations: Orientation[] = ['horizontal', 'vertical'];

    for (const ship of SHIPS) {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!placed && attempts < maxAttempts) {
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        const randomOrientation = orientations[Math.floor(Math.random() * 2)];

        const result = placeShip(newBoard, ship, row, col, randomOrientation);
        
        if (result.valid) {
          newBoard = result.board;
          newShips.push(result.ship);
          placed = true;
        }
        
        attempts++;
      }

      if (!placed) {
        // If random placement fails, reset and try again
        handleReset();
        handleRandomPlacement();
        return;
      }
    }

    setBoard(newBoard);
    setPlacedShips(newShips);
    setRoster(roster.map(s => ({ ...s, placed: true })));
    setSelectedShip(null);
  };

  const handleReset = () => {
    setBoard(createBoard());
    setPlacedShips([]);
    setRoster(SHIPS.map(ship => ({ ...ship, placed: false })));
    setSelectedShip(null);
    setInvalidPlacement(false);
  };

  const handleReady = () => {
    if (allShipsPlaced) {
      onReady(board, placedShips);
    }
  };

  const allShipsPlaced = roster.every(s => s.placed);

  const getCellContent = (row: number, col: number) => {
    const cell = board[row][col];
    const isPreview = hoverCell && selectedShip;
    
    if (isPreview) {
      const [hRow, hCol] = hoverCell;
      const previewCells = getPreviewCells(hRow, hCol);
      const isInPreview = previewCells.some(([r, c]) => r === row && c === col);
      
      if (isInPreview) {
        const valid = isPreviewValid(hRow, hCol);
        return {
          hasShip: true,
          isPreview: true,
          isValid: valid,
        };
      }
    }

    return {
      hasShip: cell.ship !== null,
      isPreview: false,
      isValid: true,
    };
  };

  const getShipColor = (shipId: string): string => {
    const ship = placedShips.find(s => s.id === shipId);
    if (!ship) return 'bg-gray-500';

    const colorMap: Record<string, string> = {
      'Carrier': 'bg-red-500',
      'Battleship': 'bg-orange-500',
      'Cruiser': 'bg-yellow-500',
      'Submarine': 'bg-green-500',
      'Destroyer': 'bg-blue-500',
    };

    return colorMap[ship.name] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Place Your Ships
          </h1>
          <p className="text-gray-400">
            {mode === 'pvp' ? 'Position your fleet and wait for your opponent' : 'Position your fleet to begin battle'}
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-start">
          {/* Game Board */}
          <div className="flex flex-col items-center">
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 md:p-6 rounded-lg shadow-xl border border-gray-700/50">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}>
                {Array.from({ length: BOARD_SIZE }).map((_, row) =>
                  Array.from({ length: BOARD_SIZE }).map((_, col) => {
                    const cellData = getCellContent(row, col);
                    const cellColor = cellData.isPreview
                      ? (cellData.isValid ? 'bg-green-500/40 border-green-400' : 'bg-red-500/40 border-red-400')
                      : cellData.hasShip
                      ? `${getShipColor(board[row][col].ship!)} border-white/30`
                      : 'bg-blue-900/30 border-blue-700/30 hover:bg-blue-700/50';

                    return (
                      <button
                        key={`${row}-${col}`}
                        onClick={() => handleCellClick(row, col)}
                        onMouseEnter={() => setHoverCell([row, col])}
                        onMouseLeave={() => setHoverCell(null)}
                        className={`
                          w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12
                          border-2 rounded transition-all
                          ${cellColor}
                          ${selectedShip ? 'cursor-pointer' : 'cursor-default'}
                          ${invalidPlacement && cellData.isPreview ? 'animate-pulse' : ''}
                          active:scale-95
                        `}
                        style={{ minWidth: '44px', minHeight: '44px' }}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6 justify-center">
              <button
                onClick={handleRandomPlacement}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105 active:scale-95"
                style={{ minHeight: '44px' }}
              >
                🎲 Random
              </button>
              
              <button
                onClick={handleReset}
                disabled={placedShips.length === 0}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105 active:scale-95 disabled:transform-none disabled:opacity-50"
                style={{ minHeight: '44px' }}
              >
                🔄 Reset
              </button>

              <button
                onClick={handleReady}
                disabled={!allShipsPlaced}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition transform hover:scale-105 active:scale-95 disabled:transform-none disabled:opacity-50 shadow-lg"
                style={{ minHeight: '44px' }}
              >
                ✓ Ready
              </button>

              <button
                onClick={onCancel}
                className="bg-red-500/80 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105 active:scale-95"
                style={{ minHeight: '44px' }}
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Ship Roster & Controls */}
          <div className="flex flex-col gap-6 lg:w-80">
            {/* Orientation Toggle */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-300">Orientation</span>
                <span className="text-xs text-gray-500">(Press R)</span>
              </div>
              <button
                onClick={toggleOrientation}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                style={{ minHeight: '44px' }}
              >
                <span className="text-2xl">
                  {orientation === 'horizontal' ? '↔️' : '↕️'}
                </span>
                <span className="capitalize">{orientation}</span>
              </button>
            </div>

            {/* Ship Roster */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700/50">
              <h3 className="text-lg font-bold mb-4">Fleet Roster</h3>
              <div className="space-y-2">
                {roster.map((ship) => {
                  const isSelected = selectedShip?.name === ship.name;
                  const colorMap: Record<string, string> = {
                    'Carrier': 'bg-red-500',
                    'Battleship': 'bg-orange-500',
                    'Cruiser': 'bg-yellow-500',
                    'Submarine': 'bg-green-500',
                    'Destroyer': 'bg-blue-500',
                  };
                  const color = colorMap[ship.name] || 'bg-gray-500';

                  return (
                    <button
                      key={ship.name}
                      onClick={() => selectShip(ship)}
                      disabled={ship.placed}
                      className={`
                        w-full p-3 rounded-lg border-2 transition transform
                        ${ship.placed
                          ? 'bg-gray-700/50 border-gray-600 opacity-50 cursor-not-allowed line-through'
                          : isSelected
                          ? `${color} border-white shadow-lg scale-105`
                          : `${color}/80 border-transparent hover:border-white/50 hover:scale-102`
                        }
                      `}
                      style={{ minHeight: '44px' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{ship.name}</span>
                        <div className="flex gap-1">
                          {Array.from({ length: ship.size }).map((_, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 bg-white/30 rounded-sm border border-white/50"
                            />
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Status */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  {placedShips.length} / {SHIPS.length} ships placed
                </div>
                {selectedShip && (
                  <div className="mt-2 text-sm text-blue-400">
                    ← Click a cell to place {selectedShip.name}
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-900/30 backdrop-blur-sm p-4 rounded-lg border border-blue-700/50">
              <h4 className="text-sm font-bold mb-2">How to Play</h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>1. Select a ship from the roster</li>
                <li>2. Rotate with R key or button</li>
                <li>3. Click the grid to place</li>
                <li>4. Click Ready when all ships placed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
