import { BOARD_SIZE, SHIPS } from './index';
import type { Cell, Ship } from './index';

export type Orientation = 'horizontal' | 'vertical';

export interface ShotResult {
  hit: boolean;
  sunk: boolean;
  shipName?: string;
  alreadyFired: boolean;
}

export interface PlacementError {
  valid: false;
  error: string;
}

export interface PlacementSuccess {
  valid: true;
  board: Cell[][];
  ship: Ship;
}

export type PlacementResult = PlacementSuccess | PlacementError;

/**
 * Creates an empty 10x10 game board
 * @returns A 10x10 grid of empty cells
 */
export function createBoard(): Cell[][] {
  const board: Cell[][] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      board[row][col] = {
        ship: null,
        hit: false
      };
    }
  }
  return board;
}

/**
 * Places a ship on the board
 * @param board - The current game board
 * @param ship - The ship to place (with name and size)
 * @param row - Starting row (0-9)
 * @param col - Starting column (0-9)
 * @param orientation - 'horizontal' or 'vertical'
 * @returns PlacementResult with updated board and ship if valid, or error if invalid
 */
export function placeShip(
  board: Cell[][],
  ship: { name: string; size: number },
  row: number,
  col: number,
  orientation: Orientation
): PlacementResult {
  // Validate coordinates are within bounds
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return {
      valid: false,
      error: 'Starting position is out of bounds'
    };
  }

  // Calculate end position
  const endRow = orientation === 'vertical' ? row + ship.size - 1 : row;
  const endCol = orientation === 'horizontal' ? col + ship.size - 1 : col;

  // Check if ship extends beyond board boundaries
  if (endRow >= BOARD_SIZE || endCol >= BOARD_SIZE) {
    return {
      valid: false,
      error: 'Ship extends beyond board boundaries'
    };
  }

  // Check for overlapping ships
  const cells: [number, number][] = [];
  for (let i = 0; i < ship.size; i++) {
    const currentRow = orientation === 'vertical' ? row + i : row;
    const currentCol = orientation === 'horizontal' ? col + i : col;
    
    if (board[currentRow][currentCol].ship !== null) {
      return {
        valid: false,
        error: 'Ship overlaps with another ship'
      };
    }
    
    cells.push([currentRow, currentCol]);
  }

  // Create a deep copy of the board
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));

  // Generate unique ship ID
  const shipId = `${ship.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Place the ship
  cells.forEach(([r, c]) => {
    newBoard[r][c].ship = shipId;
  });

  // Create the Ship object
  const placedShip: Ship = {
    id: shipId,
    name: ship.name,
    size: ship.size,
    cells: cells,
    sunk: false
  };

  return {
    valid: true,
    board: newBoard,
    ship: placedShip
  };
}

/**
 * Resolves a shot fired at a specific cell
 * @param board - The current game board
 * @param ships - Array of ships on the board
 * @param row - Target row (0-9)
 * @param col - Target column (0-9)
 * @returns ShotResult with hit/miss/sunk information and updated board/ships
 */
export function resolveShot(
  board: Cell[][],
  ships: Ship[],
  row: number,
  col: number
): { result: ShotResult; board: Cell[][]; ships: Ship[] } {
  // Validate coordinates
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    throw new Error('Shot coordinates are out of bounds');
  }

  const cell = board[row][col];

  // Check if already fired
  if (cell.hit) {
    return {
      result: {
        hit: false,
        sunk: false,
        alreadyFired: true
      },
      board,
      ships
    };
  }

  // Create deep copies
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  const newShips = ships.map(ship => ({ ...ship, cells: [...ship.cells] }));

  // Mark cell as hit
  newBoard[row][col].hit = true;

  // Check if it's a hit
  const isHit = cell.ship !== null;

  if (!isHit) {
    return {
      result: {
        hit: false,
        sunk: false,
        alreadyFired: false
      },
      board: newBoard,
      ships: newShips
    };
  }

  // Find the ship that was hit
  const hitShip = newShips.find(ship => ship.id === cell.ship);
  
  if (!hitShip) {
    throw new Error('Ship not found in ships array');
  }

  // Check if all cells of this ship have been hit
  const allCellsHit = hitShip.cells.every(([r, c]) => {
    return newBoard[r][c].hit;
  });

  if (allCellsHit) {
    hitShip.sunk = true;
  }

  return {
    result: {
      hit: true,
      sunk: allCellsHit,
      shipName: hitShip.name,
      alreadyFired: false
    },
    board: newBoard,
    ships: newShips
  };
}

/**
 * Checks if all ships have been sunk (win condition)
 * @param ships - Array of ships on the board
 * @returns true if all ships are sunk, false otherwise
 */
export function checkWin(ships: Ship[]): boolean {
  return ships.length > 0 && ships.every(ship => ship.sunk);
}
