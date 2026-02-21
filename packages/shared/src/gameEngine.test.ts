import {
  createBoard,
  placeShip,
  resolveShot,
  checkWin,
  type Orientation,
  type ShotResult,
  type PlacementResult
} from './gameEngine';
import { BOARD_SIZE, SHIPS } from './index';
import type { Cell, Ship } from './index';

describe('createBoard', () => {
  it('should create a 10x10 board', () => {
    const board = createBoard();
    expect(board).toHaveLength(BOARD_SIZE);
    expect(board[0]).toHaveLength(BOARD_SIZE);
  });

  it('should create a board with all empty cells', () => {
    const board = createBoard();
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        expect(board[row][col]).toEqual({
          ship: null,
          hit: false
        });
      }
    }
  });

  it('should create a new board instance each time', () => {
    const board1 = createBoard();
    const board2 = createBoard();
    expect(board1).not.toBe(board2);
    expect(board1[0]).not.toBe(board2[0]);
  });
});

describe('placeShip', () => {
  let board: Cell[][];

  beforeEach(() => {
    board = createBoard();
  });

  describe('valid placements', () => {
    it('should place a horizontal ship successfully', () => {
      const ship = { name: 'Destroyer', size: 2 };
      const result = placeShip(board, ship, 0, 0, 'horizontal');

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.board[0][0].ship).not.toBeNull();
        expect(result.board[0][1].ship).not.toBeNull();
        expect(result.board[0][0].ship).toBe(result.board[0][1].ship);
        expect(result.ship.name).toBe('Destroyer');
        expect(result.ship.size).toBe(2);
        expect(result.ship.cells).toEqual([[0, 0], [0, 1]]);
        expect(result.ship.sunk).toBe(false);
      }
    });

    it('should place a vertical ship successfully', () => {
      const ship = { name: 'Cruiser', size: 3 };
      const result = placeShip(board, ship, 2, 5, 'vertical');

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.board[2][5].ship).not.toBeNull();
        expect(result.board[3][5].ship).not.toBeNull();
        expect(result.board[4][5].ship).not.toBeNull();
        expect(result.ship.cells).toEqual([[2, 5], [3, 5], [4, 5]]);
      }
    });

    it('should place carrier (size 5) at bottom-right corner horizontally', () => {
      const ship = { name: 'Carrier', size: 5 };
      const result = placeShip(board, ship, 9, 5, 'horizontal');

      expect(result.valid).toBe(true);
      if (result.valid) {
        for (let i = 5; i < 10; i++) {
          expect(result.board[9][i].ship).not.toBeNull();
        }
      }
    });

    it('should not modify the original board', () => {
      const ship = { name: 'Destroyer', size: 2 };
      const originalBoard = createBoard();
      placeShip(originalBoard, ship, 0, 0, 'horizontal');

      expect(originalBoard[0][0].ship).toBeNull();
      expect(originalBoard[0][1].ship).toBeNull();
    });

    it('should generate unique ship IDs for different placements', () => {
      const ship = { name: 'Destroyer', size: 2 };
      const result1 = placeShip(board, ship, 0, 0, 'horizontal');
      const result2 = placeShip(board, ship, 2, 0, 'horizontal');

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
      if (result1.valid && result2.valid) {
        expect(result1.ship.id).not.toBe(result2.ship.id);
      }
    });
  });

  describe('invalid placements - out of bounds', () => {
    it('should reject placement with negative row', () => {
      const ship = { name: 'Destroyer', size: 2 };
      const result = placeShip(board, ship, -1, 0, 'horizontal');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Starting position is out of bounds');
      }
    });

    it('should reject placement with negative column', () => {
      const ship = { name: 'Destroyer', size: 2 };
      const result = placeShip(board, ship, 0, -1, 'horizontal');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Starting position is out of bounds');
      }
    });

    it('should reject placement with row >= BOARD_SIZE', () => {
      const ship = { name: 'Destroyer', size: 2 };
      const result = placeShip(board, ship, 10, 0, 'horizontal');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Starting position is out of bounds');
      }
    });

    it('should reject placement with column >= BOARD_SIZE', () => {
      const ship = { name: 'Destroyer', size: 2 };
      const result = placeShip(board, ship, 0, 10, 'horizontal');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Starting position is out of bounds');
      }
    });

    it('should reject horizontal ship extending beyond right edge', () => {
      const ship = { name: 'Carrier', size: 5 };
      const result = placeShip(board, ship, 0, 6, 'horizontal');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Ship extends beyond board boundaries');
      }
    });

    it('should reject vertical ship extending beyond bottom edge', () => {
      const ship = { name: 'Battleship', size: 4 };
      const result = placeShip(board, ship, 7, 0, 'vertical');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('Ship extends beyond board boundaries');
      }
    });
  });

  describe('invalid placements - overlapping ships', () => {
    it('should reject placement overlapping with existing horizontal ship', () => {
      const destroyer = { name: 'Destroyer', size: 2 };
      const result1 = placeShip(board, destroyer, 0, 0, 'horizontal');
      
      expect(result1.valid).toBe(true);
      if (result1.valid) {
        const cruiser = { name: 'Cruiser', size: 3 };
        const result2 = placeShip(result1.board, cruiser, 0, 1, 'horizontal');
        
        expect(result2.valid).toBe(false);
        if (!result2.valid) {
          expect(result2.error).toBe('Ship overlaps with another ship');
        }
      }
    });

    it('should reject placement overlapping with existing vertical ship', () => {
      const destroyer = { name: 'Destroyer', size: 2 };
      const result1 = placeShip(board, destroyer, 2, 3, 'vertical');
      
      expect(result1.valid).toBe(true);
      if (result1.valid) {
        const cruiser = { name: 'Cruiser', size: 3 };
        const result2 = placeShip(result1.board, cruiser, 3, 2, 'horizontal');
        
        expect(result2.valid).toBe(false);
        if (!result2.valid) {
          expect(result2.error).toBe('Ship overlaps with another ship');
        }
      }
    });

    it('should reject placement when starting cell is occupied', () => {
      const destroyer = { name: 'Destroyer', size: 2 };
      const result1 = placeShip(board, destroyer, 5, 5, 'horizontal');
      
      expect(result1.valid).toBe(true);
      if (result1.valid) {
        const submarine = { name: 'Submarine', size: 3 };
        const result2 = placeShip(result1.board, submarine, 5, 5, 'vertical');
        
        expect(result2.valid).toBe(false);
        if (!result2.valid) {
          expect(result2.error).toBe('Ship overlaps with another ship');
        }
      }
    });
  });

  describe('edge cases', () => {
    it('should handle all standard ships from SHIPS constant', () => {
      let currentBoard = createBoard();
      
      SHIPS.forEach((ship, index) => {
        const result = placeShip(currentBoard, ship, index, 0, 'horizontal');
        expect(result.valid).toBe(true);
        if (result.valid) {
          currentBoard = result.board;
        }
      });
    });
  });
});

describe('resolveShot', () => {
  let board: Cell[][];
  let ships: Ship[];

  beforeEach(() => {
    board = createBoard();
    ships = [];
  });

  describe('valid shots', () => {
    it('should handle miss on empty cell', () => {
      const { result, board: newBoard, ships: newShips } = resolveShot(board, ships, 0, 0);

      expect(result).toEqual({
        hit: false,
        sunk: false,
        alreadyFired: false
      });
      expect(newBoard[0][0].hit).toBe(true);
      expect(newBoard[0][0].ship).toBeNull();
    });

    it('should handle hit on ship', () => {
      const destroyer = { name: 'Destroyer', size: 2 };
      const placementResult = placeShip(board, destroyer, 0, 0, 'horizontal');
      
      expect(placementResult.valid).toBe(true);
      if (placementResult.valid) {
        board = placementResult.board;
        ships = [placementResult.ship];

        const { result, board: newBoard } = resolveShot(board, ships, 0, 0);

        expect(result.hit).toBe(true);
        expect(result.sunk).toBe(false);
        expect(result.shipName).toBe('Destroyer');
        expect(result.alreadyFired).toBe(false);
        expect(newBoard[0][0].hit).toBe(true);
      }
    });

    it('should detect when ship is sunk', () => {
      const destroyer = { name: 'Destroyer', size: 2 };
      const placementResult = placeShip(board, destroyer, 0, 0, 'horizontal');
      
      expect(placementResult.valid).toBe(true);
      if (placementResult.valid) {
        board = placementResult.board;
        ships = [placementResult.ship];

        // First hit
        const shot1 = resolveShot(board, ships, 0, 0);
        expect(shot1.result.hit).toBe(true);
        expect(shot1.result.sunk).toBe(false);

        // Second hit - should sink the ship
        const shot2 = resolveShot(shot1.board, shot1.ships, 0, 1);
        expect(shot2.result.hit).toBe(true);
        expect(shot2.result.sunk).toBe(true);
        expect(shot2.result.shipName).toBe('Destroyer');
        expect(shot2.ships[0].sunk).toBe(true);
      }
    });

    it('should handle already fired cell', () => {
      const shot1 = resolveShot(board, ships, 5, 5);
      expect(shot1.result.alreadyFired).toBe(false);

      const shot2 = resolveShot(shot1.board, shot1.ships, 5, 5);
      expect(shot2.result).toEqual({
        hit: false,
        sunk: false,
        alreadyFired: true
      });
      
      // Board should not be modified further
      expect(shot2.board).toBe(shot1.board);
      expect(shot2.ships).toBe(shot1.ships);
    });

    it('should not modify original board and ships', () => {
      const originalBoard = createBoard();
      const originalShips: Ship[] = [];
      
      resolveShot(originalBoard, originalShips, 0, 0);

      expect(originalBoard[0][0].hit).toBe(false);
    });

    it('should handle sinking a larger ship (Carrier)', () => {
      const carrier = { name: 'Carrier', size: 5 };
      const placementResult = placeShip(board, carrier, 0, 0, 'horizontal');
      
      expect(placementResult.valid).toBe(true);
      if (placementResult.valid) {
        board = placementResult.board;
        ships = [placementResult.ship];

        // Hit all cells except the last
        let currentBoard = board;
        let currentShips = ships;
        
        for (let i = 0; i < 4; i++) {
          const shot = resolveShot(currentBoard, currentShips, 0, i);
          expect(shot.result.hit).toBe(true);
          expect(shot.result.sunk).toBe(false);
          currentBoard = shot.board;
          currentShips = shot.ships;
        }

        // Final hit should sink the ship
        const finalShot = resolveShot(currentBoard, currentShips, 0, 4);
        expect(finalShot.result.hit).toBe(true);
        expect(finalShot.result.sunk).toBe(true);
        expect(finalShot.result.shipName).toBe('Carrier');
      }
    });

    it('should handle multiple ships on the board', () => {
      const destroyer = { name: 'Destroyer', size: 2 };
      const cruiser = { name: 'Cruiser', size: 3 };
      
      const placement1 = placeShip(board, destroyer, 0, 0, 'horizontal');
      expect(placement1.valid).toBe(true);
      
      if (placement1.valid) {
        const placement2 = placeShip(placement1.board, cruiser, 2, 0, 'vertical');
        expect(placement2.valid).toBe(true);
        
        if (placement2.valid) {
          board = placement2.board;
          ships = [placement1.ship, placement2.ship];

          // Hit destroyer
          const shot1 = resolveShot(board, ships, 0, 0);
          expect(shot1.result.shipName).toBe('Destroyer');
          
          // Hit cruiser
          const shot2 = resolveShot(shot1.board, shot1.ships, 2, 0);
          expect(shot2.result.shipName).toBe('Cruiser');
          
          expect(shot2.ships).toHaveLength(2);
        }
      }
    });
  });

  describe('invalid shots', () => {
    it('should throw error for out of bounds row (negative)', () => {
      expect(() => resolveShot(board, ships, -1, 0)).toThrow('Shot coordinates are out of bounds');
    });

    it('should throw error for out of bounds row (>= BOARD_SIZE)', () => {
      expect(() => resolveShot(board, ships, 10, 0)).toThrow('Shot coordinates are out of bounds');
    });

    it('should throw error for out of bounds column (negative)', () => {
      expect(() => resolveShot(board, ships, 0, -1)).toThrow('Shot coordinates are out of bounds');
    });

    it('should throw error for out of bounds column (>= BOARD_SIZE)', () => {
      expect(() => resolveShot(board, ships, 0, 10)).toThrow('Shot coordinates are out of bounds');
    });
  });

  describe('edge cases', () => {
    it('should throw error if ship in cell is not found in ships array', () => {
      // Manually create an invalid state
      const invalidBoard = createBoard();
      invalidBoard[0][0].ship = 'non-existent-ship-id';

      expect(() => resolveShot(invalidBoard, ships, 0, 0)).toThrow('Ship not found in ships array');
    });

    it('should handle vertical ship sinking', () => {
      const submarine = { name: 'Submarine', size: 3 };
      const placementResult = placeShip(board, submarine, 3, 5, 'vertical');
      
      expect(placementResult.valid).toBe(true);
      if (placementResult.valid) {
        board = placementResult.board;
        ships = [placementResult.ship];

        let currentBoard = board;
        let currentShips = ships;

        // Hit all three cells
        for (let i = 3; i < 6; i++) {
          const shot = resolveShot(currentBoard, currentShips, i, 5);
          expect(shot.result.hit).toBe(true);
          
          if (i < 5) {
            expect(shot.result.sunk).toBe(false);
          } else {
            expect(shot.result.sunk).toBe(true);
          }
          
          currentBoard = shot.board;
          currentShips = shot.ships;
        }
      }
    });
  });
});

describe('checkWin', () => {
  it('should return false for empty ships array', () => {
    expect(checkWin([])).toBe(false);
  });

  it('should return false when no ships are sunk', () => {
    const ships: Ship[] = [
      {
        id: 'ship-1',
        name: 'Destroyer',
        size: 2,
        cells: [[0, 0], [0, 1]],
        sunk: false
      },
      {
        id: 'ship-2',
        name: 'Cruiser',
        size: 3,
        cells: [[2, 0], [3, 0], [4, 0]],
        sunk: false
      }
    ];

    expect(checkWin(ships)).toBe(false);
  });

  it('should return false when some ships are sunk', () => {
    const ships: Ship[] = [
      {
        id: 'ship-1',
        name: 'Destroyer',
        size: 2,
        cells: [[0, 0], [0, 1]],
        sunk: true
      },
      {
        id: 'ship-2',
        name: 'Cruiser',
        size: 3,
        cells: [[2, 0], [3, 0], [4, 0]],
        sunk: false
      }
    ];

    expect(checkWin(ships)).toBe(false);
  });

  it('should return true when all ships are sunk', () => {
    const ships: Ship[] = [
      {
        id: 'ship-1',
        name: 'Destroyer',
        size: 2,
        cells: [[0, 0], [0, 1]],
        sunk: true
      },
      {
        id: 'ship-2',
        name: 'Cruiser',
        size: 3,
        cells: [[2, 0], [3, 0], [4, 0]],
        sunk: true
      }
    ];

    expect(checkWin(ships)).toBe(true);
  });

  it('should return true when single ship is sunk', () => {
    const ships: Ship[] = [
      {
        id: 'ship-1',
        name: 'Destroyer',
        size: 2,
        cells: [[0, 0], [0, 1]],
        sunk: true
      }
    ];

    expect(checkWin(ships)).toBe(true);
  });

  it('should handle all standard ships', () => {
    const ships: Ship[] = SHIPS.map((ship, index) => ({
      id: `ship-${index}`,
      name: ship.name,
      size: ship.size,
      cells: Array.from({ length: ship.size }, (_, i) => [index, i] as [number, number]),
      sunk: false
    }));

    expect(checkWin(ships)).toBe(false);

    // Sink all ships
    ships.forEach(ship => ship.sunk = true);
    expect(checkWin(ships)).toBe(true);
  });
});

describe('Integration: Full game flow', () => {
  it('should support a complete game scenario', () => {
    // Create board
    let board = createBoard();
    let ships: Ship[] = [];

    // Place all 5 ships
    const destroyer = { name: 'Destroyer', size: 2 };
    const placement1 = placeShip(board, destroyer, 0, 0, 'horizontal');
    expect(placement1.valid).toBe(true);
    
    if (placement1.valid) {
      board = placement1.board;
      ships.push(placement1.ship);
    }

    const submarine = { name: 'Submarine', size: 3 };
    const placement2 = placeShip(board, submarine, 2, 0, 'vertical');
    expect(placement2.valid).toBe(true);
    
    if (placement2.valid) {
      board = placement2.board;
      ships.push(placement2.ship);
    }

    // Game should not be won yet
    expect(checkWin(ships)).toBe(false);

    // Sink the destroyer
    let shot = resolveShot(board, ships, 0, 0);
    board = shot.board;
    ships = shot.ships;
    expect(shot.result.hit).toBe(true);
    expect(shot.result.sunk).toBe(false);

    shot = resolveShot(board, ships, 0, 1);
    board = shot.board;
    ships = shot.ships;
    expect(shot.result.hit).toBe(true);
    expect(shot.result.sunk).toBe(true);

    // Game still not won (submarine still alive)
    expect(checkWin(ships)).toBe(false);

    // Sink the submarine
    shot = resolveShot(board, ships, 2, 0);
    board = shot.board;
    ships = shot.ships;

    shot = resolveShot(board, ships, 3, 0);
    board = shot.board;
    ships = shot.ships;

    shot = resolveShot(board, ships, 4, 0);
    board = shot.board;
    ships = shot.ships;
    expect(shot.result.sunk).toBe(true);

    // Now the game should be won
    expect(checkWin(ships)).toBe(true);
  });
});
