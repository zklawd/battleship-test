import { BOARD_SIZE, SHIPS } from './index';
import { createBoard, placeShip, type Orientation } from './gameEngine';
import type { Cell, Ship } from './index';

export interface ShotHistory {
  row: number;
  col: number;
  hit: boolean;
  sunk?: boolean;
}

export interface AIState {
  mode: 'hunt' | 'target';
  targetQueue: Array<{ row: number; col: number }>;
  lastHit: { row: number; col: number } | null;
  currentShipHits: Array<{ row: number; col: number }>;
  lastProcessedShotCount: number;
}

/**
 * AI Opponent for Battleship game
 * Uses hunt/target strategy:
 * - Hunt mode: fires at random valid cells
 * - Target mode: when a hit is detected, systematically fires at adjacent cells
 */
export class AIOpponent {
  private state: AIState;

  constructor() {
    this.state = {
      mode: 'hunt',
      targetQueue: [],
      lastHit: null,
      currentShipHits: [],
      lastProcessedShotCount: 0
    };
  }

  /**
   * Randomly places all ships on a board
   * @returns Object with board and ships array
   */
  public placeShipsRandomly(): { board: Cell[][]; ships: Ship[] } {
    let board = createBoard();
    const ships: Ship[] = [];
    
    for (const shipTemplate of SHIPS) {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!placed && attempts < maxAttempts) {
        attempts++;
        
        const row = Math.floor(Math.random() * BOARD_SIZE);
        const col = Math.floor(Math.random() * BOARD_SIZE);
        const orientation: Orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        
        const result = placeShip(board, shipTemplate, row, col, orientation);
        
        if (result.valid) {
          board = result.board;
          ships.push(result.ship);
          placed = true;
        }
      }

      if (!placed) {
        // If we couldn't place a ship after max attempts, restart
        return this.placeShipsRandomly();
      }
    }

    return { board, ships };
  }

  /**
   * Gets the next shot based on hunt/target strategy
   * @param shotHistory - Array of all previous shots with their results
   * @returns Coordinates of the next shot {row, col}
   */
  public getNextShot(shotHistory: ShotHistory[]): { row: number; col: number } {
    // Create a set of already-fired positions for quick lookup
    const firedPositions = new Set<string>();
    shotHistory.forEach(shot => {
      firedPositions.add(`${shot.row},${shot.col}`);
    });

    // Process shot history to update AI state
    this.updateStateFromHistory(shotHistory, firedPositions);

    // Target mode: we have pending targets to check
    if (this.state.mode === 'target' && this.state.targetQueue.length > 0) {
      return this.getTargetModeShot(firedPositions);
    }

    // Hunt mode: random valid cell
    return this.getHuntModeShot(firedPositions);
  }

  /**
   * Updates AI state based on shot history
   */
  private updateStateFromHistory(shotHistory: ShotHistory[], firedPositions: Set<string>): void {
    if (shotHistory.length === 0) {
      this.resetState();
      return;
    }

    // Only process new shots since last call
    const newShots = shotHistory.slice(this.state.lastProcessedShotCount);
    
    for (const shot of newShots) {
      // If shot was a hit and not yet sunk
      if (shot.hit && !shot.sunk) {
        // Switch to target mode
        this.state.mode = 'target';
        this.state.lastHit = { row: shot.row, col: shot.col };
        this.state.currentShipHits.push({ row: shot.row, col: shot.col });

        // Add adjacent cells to target queue if not already fired
        this.addAdjacentTargets(shot.row, shot.col, firedPositions);
      }

      // If shot sunk a ship
      if (shot.sunk) {
        // Return to hunt mode
        this.state.mode = 'hunt';
        this.state.targetQueue = [];
        this.state.currentShipHits = [];
        this.state.lastHit = null;
      }
    }
    
    // Update the count of processed shots
    this.state.lastProcessedShotCount = shotHistory.length;
  }

  /**
   * Adds adjacent cells (up, down, left, right) to the target queue
   */
  private addAdjacentTargets(row: number, col: number, firedPositions: Set<string>): void {
    const directions = [
      { row: -1, col: 0 },  // up
      { row: 1, col: 0 },   // down
      { row: 0, col: -1 },  // left
      { row: 0, col: 1 }    // right
    ];

    for (const dir of directions) {
      const newRow = row + dir.row;
      const newCol = col + dir.col;
      const posKey = `${newRow},${newCol}`;

      // Check if valid and not already fired
      if (
        newRow >= 0 && newRow < BOARD_SIZE &&
        newCol >= 0 && newCol < BOARD_SIZE &&
        !firedPositions.has(posKey)
      ) {
        // Add to queue if not already there
        const alreadyQueued = this.state.targetQueue.some(
          t => t.row === newRow && t.col === newCol
        );
        if (!alreadyQueued) {
          this.state.targetQueue.push({ row: newRow, col: newCol });
        }
      }
    }
  }

  /**
   * Gets next shot in target mode
   */
  private getTargetModeShot(firedPositions: Set<string>): { row: number; col: number } {
    // Remove any targets that have already been fired at
    this.state.targetQueue = this.state.targetQueue.filter(
      target => !firedPositions.has(`${target.row},${target.col}`)
    );

    if (this.state.targetQueue.length === 0) {
      // No more targets, switch to hunt mode
      this.state.mode = 'hunt';
      return this.getHuntModeShot(firedPositions);
    }

    // Return the first target in the queue
    return this.state.targetQueue.shift()!;
  }

  /**
   * Gets next shot in hunt mode (random valid cell)
   */
  private getHuntModeShot(firedPositions: Set<string>): { row: number; col: number } {
    const availableCells: Array<{ row: number; col: number }> = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const posKey = `${row},${col}`;
        if (!firedPositions.has(posKey)) {
          availableCells.push({ row, col });
        }
      }
    }

    if (availableCells.length === 0) {
      throw new Error('No available cells to fire at');
    }

    const randomIndex = Math.floor(Math.random() * availableCells.length);
    return availableCells[randomIndex];
  }

  /**
   * Resets AI state to initial hunt mode
   */
  private resetState(): void {
    this.state = {
      mode: 'hunt',
      targetQueue: [],
      lastHit: null,
      currentShipHits: [],
      lastProcessedShotCount: 0
    };
  }

  /**
   * Gets current AI state (for debugging/testing)
   */
  public getState(): AIState {
    return { ...this.state };
  }
}
