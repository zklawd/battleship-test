// Game Constants
export const BOARD_SIZE = 10;

export const SHIPS = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 }
] as const;

// Type Definitions
export interface Cell {
  ship: string | null;    // ship ID or null
  hit: boolean;
}

export interface Ship {
  id: string;
  name: string;
  size: number;
  cells: [number, number][];
  sunk: boolean;
}

export interface Player {
  socketId: string;
  board: Cell[][];        // 10x10
  ships: Ship[];
  ready: boolean;
}

export interface Room {
  code: string;           // 6-char alphanumeric
  players: Player[];      // max 2
  phase: 'waiting' | 'placement' | 'battle' | 'finished';
  currentTurn: string;    // player socket ID
  createdAt: number;
  lastActivity: number;
}

// Export game engine functions
export {
  createBoard,
  placeShip,
  resolveShot,
  checkWin,
  type Orientation,
  type ShotResult,
  type PlacementError,
  type PlacementSuccess,
  type PlacementResult
} from './gameEngine';

// Export AI opponent
export {
  AIOpponent,
  type ShotHistory,
  type AIState
} from './aiOpponent';
