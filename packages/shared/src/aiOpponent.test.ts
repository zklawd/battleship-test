import { AIOpponent, type ShotHistory } from './aiOpponent';
import { BOARD_SIZE, SHIPS } from './index';
import { placeShip } from './gameEngine';

describe('AIOpponent', () => {
  let ai: AIOpponent;

  beforeEach(() => {
    ai = new AIOpponent();
  });

  describe('placeShipsRandomly', () => {
    it('should place all 5 ships on the board', () => {
      const { board, ships } = ai.placeShipsRandomly();
      
      expect(ships).toHaveLength(5);
      expect(ships.map(s => s.name).sort()).toEqual(
        SHIPS.map(s => s.name).sort()
      );
    });

    it('should place ships in valid positions (no overlap, within bounds)', () => {
      const { board, ships } = ai.placeShipsRandomly();
      
      // Count occupied cells on board
      let occupiedCells = 0;
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (board[row][col].ship !== null) {
            occupiedCells++;
          }
        }
      }
      
      // Total ship cells should be 5+4+3+3+2 = 17
      const expectedCells = SHIPS.reduce((sum, ship) => sum + ship.size, 0);
      expect(occupiedCells).toBe(expectedCells);
    });

    it('should place ships with valid coordinates', () => {
      const { ships } = ai.placeShipsRandomly();
      
      ships.forEach(ship => {
        ship.cells.forEach(([row, col]) => {
          expect(row).toBeGreaterThanOrEqual(0);
          expect(row).toBeLessThan(BOARD_SIZE);
          expect(col).toBeGreaterThanOrEqual(0);
          expect(col).toBeLessThan(BOARD_SIZE);
        });
      });
    });

    it('should produce different placements on repeated calls', () => {
      const placements: string[] = [];
      
      // Generate 5 placements and check they're not all identical
      for (let i = 0; i < 5; i++) {
        const { ships } = ai.placeShipsRandomly();
        const signature = ships
          .map(s => s.cells.map(c => c.join(',')).join('|'))
          .join(';');
        placements.push(signature);
      }
      
      // At least one should be different (extremely high probability)
      const uniquePlacements = new Set(placements);
      expect(uniquePlacements.size).toBeGreaterThan(1);
    });
  });

  describe('getNextShot - Hunt Mode', () => {
    it('should return a valid cell on first shot', () => {
      const shot = ai.getNextShot([]);
      
      expect(shot.row).toBeGreaterThanOrEqual(0);
      expect(shot.row).toBeLessThan(BOARD_SIZE);
      expect(shot.col).toBeGreaterThanOrEqual(0);
      expect(shot.col).toBeLessThan(BOARD_SIZE);
    });

    it('should never fire at the same cell twice', () => {
      const shotHistory: ShotHistory[] = [];
      const firedPositions = new Set<string>();
      
      // Simulate 50 shots in hunt mode (all misses)
      for (let i = 0; i < 50; i++) {
        const shot = ai.getNextShot(shotHistory);
        const posKey = `${shot.row},${shot.col}`;
        
        expect(firedPositions.has(posKey)).toBe(false);
        
        firedPositions.add(posKey);
        shotHistory.push({ row: shot.row, col: shot.col, hit: false });
      }
    });

    it('should stay in hunt mode when all shots are misses', () => {
      const shotHistory: ShotHistory[] = [];
      
      // Fire 10 shots, all misses
      for (let i = 0; i < 10; i++) {
        const shot = ai.getNextShot(shotHistory);
        shotHistory.push({ row: shot.row, col: shot.col, hit: false });
      }
      
      const state = ai.getState();
      expect(state.mode).toBe('hunt');
      expect(state.targetQueue).toHaveLength(0);
    });
  });

  describe('getNextShot - Target Mode', () => {
    it('should switch to target mode after a hit', () => {
      const shotHistory: ShotHistory[] = [
        { row: 5, col: 5, hit: false },
        { row: 3, col: 3, hit: true } // Hit!
      ];
      
      // Next shot should be in target mode
      ai.getNextShot(shotHistory);
      
      const state = ai.getState();
      expect(state.mode).toBe('target');
      expect(state.targetQueue.length).toBeGreaterThan(0);
    });

    it('should target adjacent cells after a hit', () => {
      const shotHistory: ShotHistory[] = [
        { row: 5, col: 5, hit: true } // Hit at (5,5)
      ];
      
      const nextShot = ai.getNextShot(shotHistory);
      
      // Next shot should be adjacent to (5,5)
      const isAdjacent = 
        (nextShot.row === 4 && nextShot.col === 5) || // up
        (nextShot.row === 6 && nextShot.col === 5) || // down
        (nextShot.row === 5 && nextShot.col === 4) || // left
        (nextShot.row === 5 && nextShot.col === 6);   // right
      
      expect(isAdjacent).toBe(true);
    });

    it('should only target valid adjacent cells (within bounds)', () => {
      const shotHistory: ShotHistory[] = [
        { row: 0, col: 0, hit: true } // Hit at top-left corner
      ];
      
      const nextShot = ai.getNextShot(shotHistory);
      
      // Can only go right or down
      const isValid = 
        (nextShot.row === 1 && nextShot.col === 0) || // down
        (nextShot.row === 0 && nextShot.col === 1);   // right
      
      expect(isValid).toBe(true);
    });

    it('should not target already-fired cells', () => {
      const shotHistory: ShotHistory[] = [
        { row: 5, col: 5, hit: true },  // Hit
        { row: 5, col: 4, hit: false }, // Miss (left)
        { row: 4, col: 5, hit: false }, // Miss (up)
      ];
      
      const nextShot = ai.getNextShot(shotHistory);
      
      // Should target down or right, not left or up
      const isValid = 
        (nextShot.row === 6 && nextShot.col === 5) || // down
        (nextShot.row === 5 && nextShot.col === 6);   // right
      
      expect(isValid).toBe(true);
    });

    it('should continue targeting until ship is sunk', () => {
      const shotHistory: ShotHistory[] = [
        { row: 5, col: 5, hit: true, sunk: false },  // First hit
        { row: 5, col: 6, hit: true, sunk: false },  // Second hit (horizontal ship)
      ];
      
      ai.getNextShot(shotHistory);
      
      const state = ai.getState();
      expect(state.mode).toBe('target');
    });

    it('should return to hunt mode when ship is sunk', () => {
      const shotHistory: ShotHistory[] = [
        { row: 5, col: 5, hit: true, sunk: false },
        { row: 5, col: 6, hit: true, sunk: true }  // Ship sunk!
      ];
      
      ai.getNextShot(shotHistory);
      
      const state = ai.getState();
      expect(state.mode).toBe('hunt');
      expect(state.targetQueue).toHaveLength(0);
    });
  });

  describe('getNextShot - Complete Game Simulation', () => {
    it('should complete a full game without firing at the same cell twice', () => {
      const { board, ships } = ai.placeShipsRandomly();
      const shotHistory: ShotHistory[] = [];
      const firedPositions = new Set<string>();
      
      let shotCount = 0;
      const maxShots = BOARD_SIZE * BOARD_SIZE; // Maximum possible shots
      
      // Keep firing until all ships are sunk or we run out of cells
      while (shotCount < maxShots) {
        const shot = ai.getNextShot(shotHistory);
        const posKey = `${shot.row},${shot.col}`;
        
        // Verify we haven't fired at this cell before
        expect(firedPositions.has(posKey)).toBe(false);
        
        firedPositions.add(posKey);
        
        // Check if it's a hit
        const cell = board[shot.row][shot.col];
        const hit = cell.ship !== null;
        
        // Determine if ship is sunk
        let sunk = false;
        if (hit) {
          const hitShip = ships.find(s => s.id === cell.ship);
          if (hitShip) {
            const allHit = hitShip.cells.every(([r, c]) => {
              return shotHistory.some(sh => sh.row === r && sh.col === c && sh.hit) ||
                     (r === shot.row && c === shot.col);
            });
            sunk = allHit;
          }
        }
        
        shotHistory.push({ row: shot.row, col: shot.col, hit, sunk });
        shotCount++;
        
        // Check if all ships are sunk
        const allShipsSunk = ships.every(ship => 
          ship.cells.every(([r, c]) => 
            shotHistory.some(sh => sh.row === r && sh.col === c && sh.hit)
          )
        );
        
        if (allShipsSunk) {
          break;
        }
      }
      
      expect(shotCount).toBeLessThanOrEqual(maxShots);
    });
  });

  describe('Hunt/Target Mode Transitions', () => {
    it('should transition: hunt -> target -> hunt correctly', () => {
      // Start in hunt mode
      expect(ai.getState().mode).toBe('hunt');
      
      // Miss
      let shotHistory: ShotHistory[] = [
        { row: 0, col: 0, hit: false }
      ];
      ai.getNextShot(shotHistory);
      expect(ai.getState().mode).toBe('hunt');
      
      // Hit (switch to target)
      shotHistory.push({ row: 1, col: 1, hit: true, sunk: false });
      ai.getNextShot(shotHistory);
      expect(ai.getState().mode).toBe('target');
      
      // Hit and sunk (switch back to hunt)
      shotHistory.push({ row: 1, col: 2, hit: true, sunk: true });
      ai.getNextShot(shotHistory);
      expect(ai.getState().mode).toBe('hunt');
    });

    it('should handle multiple hits before sinking', () => {
      const shotHistory: ShotHistory[] = [
        { row: 5, col: 5, hit: true, sunk: false },
        { row: 5, col: 6, hit: true, sunk: false },
        { row: 5, col: 7, hit: true, sunk: false },
      ];
      
      ai.getNextShot(shotHistory);
      expect(ai.getState().mode).toBe('target');
      
      // Now sink it
      shotHistory.push({ row: 5, col: 8, hit: true, sunk: true });
      ai.getNextShot(shotHistory);
      expect(ai.getState().mode).toBe('hunt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle hitting a ship at board edge', () => {
      const shotHistory: ShotHistory[] = [
        { row: 0, col: 9, hit: true } // Top-right corner
      ];
      
      const nextShot = ai.getNextShot(shotHistory);
      
      // Can only go left or down
      const isValid = 
        (nextShot.row === 1 && nextShot.col === 9) || // down
        (nextShot.row === 0 && nextShot.col === 8);   // left
      
      expect(isValid).toBe(true);
    });

    it('should handle hitting a ship with all adjacent cells already fired', () => {
      const shotHistory: ShotHistory[] = [
        { row: 5, col: 5, hit: true, sunk: false },
        { row: 4, col: 5, hit: false }, // up - miss
        { row: 6, col: 5, hit: false }, // down - miss
        { row: 5, col: 4, hit: false }, // left - miss
        { row: 5, col: 6, hit: false }, // right - miss
      ];
      
      // AI should fall back to hunt mode since target queue is empty
      const nextShot = ai.getNextShot(shotHistory);
      
      // Should return a valid shot (hunt mode)
      expect(nextShot.row).toBeGreaterThanOrEqual(0);
      expect(nextShot.row).toBeLessThan(BOARD_SIZE);
      expect(nextShot.col).toBeGreaterThanOrEqual(0);
      expect(nextShot.col).toBeLessThan(BOARD_SIZE);
      
      // Should not be any of the already-fired positions
      const firedPos = shotHistory.map(s => `${s.row},${s.col}`);
      expect(firedPos).not.toContain(`${nextShot.row},${nextShot.col}`);
    });

    it('should throw error when no cells available to fire at', () => {
      // Create shot history with all 100 cells
      const shotHistory: ShotHistory[] = [];
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          shotHistory.push({ row, col, hit: false });
        }
      }
      
      expect(() => ai.getNextShot(shotHistory)).toThrow('No available cells to fire at');
    });
  });

  describe('AI Does Not Cheat', () => {
    it('should not have access to opponent ship positions (black box test)', () => {
      // The AI should work purely based on shot history
      // It should not accept or require board state
      const shotHistory: ShotHistory[] = [
        { row: 3, col: 3, hit: false },
        { row: 5, col: 5, hit: true }
      ];
      
      // This should work without any board information
      const nextShot = ai.getNextShot(shotHistory);
      
      expect(nextShot).toBeDefined();
      expect(typeof nextShot.row).toBe('number');
      expect(typeof nextShot.col).toBe('number');
    });
  });
});
