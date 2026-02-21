# Battleship Game Server

Express + Socket.IO server that manages real-time Battleship games with authoritative game state management.

## Features

- ✅ Cryptographically random 6-character room codes
- ✅ Room creation and joining with validation
- ✅ Ship placement validation using shared game logic
- ✅ Turn-based battle phase with server-side validation
- ✅ Opponent ship positions never sent to clients (no cheating)
- ✅ Automatic idle room cleanup (10 minutes)
- ✅ Disconnect/reconnect handling with 60-second grace period
- ✅ Automatic game forfeit after reconnect timeout

## Getting Started

### Development

```bash
npm run dev
```

Server runs on `http://localhost:3001`

### Production

```bash
npm run build
npm start
```

### Environment Variables

- `PORT` - Server port (default: 3001)
- `CLIENT_URL` - CORS origin for client (default: http://localhost:5173)

## Socket.IO Events

### Client → Server

#### `create-room`

Create a new game room.

**Response:** `room-created`
```typescript
{
  code: string // 6-character alphanumeric code
}
```

#### `join-room`

Join an existing room.

**Payload:**
```typescript
{
  code: string // Room code (case-insensitive)
}
```

**Response:** `room-joined` or `error`
```typescript
// Success
{
  code: string
}

// Error
{
  message: 'Invalid room code' | 'Room is full'
}
```

#### `place-ships`

Submit ship placements for validation.

**Payload:**
```typescript
{
  placements: Array<{
    ship: { name: string; size: number };
    row: number;    // 0-9
    col: number;    // 0-9
    orientation: 'horizontal' | 'vertical';
  }>
}
```

**Response:** `placement-confirmed` or `error`

**Note:** All 5 ships must be placed. Server validates using shared `placeShip` logic.

#### `fire`

Fire a shot at the opponent's board (only during your turn).

**Payload:**
```typescript
{
  row: number;  // 0-9
  col: number;  // 0-9
}
```

**Validation:**
- Must be your turn
- Must be in battle phase
- Cannot fire at already-hit cells

#### `reconnect-to-room`

Attempt to reconnect to a room after disconnection.

**Payload:**
```typescript
{
  code: string // Room code
}
```

### Server → Client

#### `phase:placement`

Both players have joined; ship placement can begin.

#### `phase:battle`

Both players are ready; battle phase begins.

**Payload:**
```typescript
{
  currentTurn: string;  // Socket ID of player with current turn
  isYourTurn: boolean;
}
```

#### `shot-result`

Result of your shot (sent to shooter).

**Payload:**
```typescript
{
  row: number;
  col: number;
  hit: boolean;
  sunk: boolean;
  shipName?: string;  // Present if hit
}
```

#### `opponent-shot`

Result of opponent's shot (sent to defender).

**Payload:**
```typescript
{
  row: number;
  col: number;
  hit: boolean;
  sunk: boolean;
  shipName?: string;
}
```

#### `turn-changed`

Turn has switched to the other player.

**Payload:**
```typescript
{
  currentTurn: string;  // Socket ID of current turn
  isYourTurn: boolean;
}
```

#### `game-over`

Game has ended.

**Payload:**
```typescript
{
  winner: string;  // Socket ID of winner
  reason: 'all-ships-sunk' | 'opponent-disconnect';
}
```

#### `opponent-disconnected`

Opponent has disconnected; 60-second reconnect timer started.

#### `opponent-reconnected`

Opponent has reconnected within grace period.

#### `room-closed`

Room was closed due to inactivity.

**Payload:**
```typescript
{
  reason: string;
}
```

#### `game-state`

Current game state (sent on reconnection).

**Payload:**
```typescript
{
  phase: 'waiting' | 'placement' | 'battle' | 'finished';
  yourBoard: Cell[][];
  yourShips: Ship[];
  ready: boolean;
  currentTurn: string;
  isYourTurn: boolean;
}
```

#### `error`

Error message for failed operations.

**Payload:**
```typescript
{
  message: string;
}
```

## REST Endpoints

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "boardSize": 10,
  "ships": [...],
  "activeRooms": 5
}
```

## Security

- Room codes are generated using `crypto.randomBytes` for cryptographic randomness
- Server is authoritative: all game logic runs server-side
- Opponent ship positions are **never** sent to clients
- All placements and shots are validated against shared game rules

## Game Flow

1. **Player 1** creates room → receives room code
2. **Player 2** joins room with code
3. Server emits `phase:placement` to both players
4. Both players submit ship placements via `place-ships`
5. Server validates placements and marks players as ready
6. When both ready, server randomly chooses first player and emits `phase:battle`
7. Players take turns firing shots via `fire` event
8. Server validates turns, resolves shots, and broadcasts results
9. Game ends when all of one player's ships are sunk

## Cleanup & Timeouts

- **Idle timeout:** Rooms idle for 10 minutes are automatically closed
- **Disconnect timeout:** Disconnected players have 60 seconds to reconnect before forfeiting
- **Room cleanup:** Empty rooms are automatically deleted

## Error Handling

All client operations that can fail emit an `error` event with a descriptive message:

- Invalid room codes
- Full rooms
- Out-of-phase actions (e.g., firing during placement)
- Invalid placements (overlapping, out of bounds)
- Turn violations (firing when it's not your turn)
- Already-fired cell targeting

## Development Notes

- Built with TypeScript for type safety
- Uses shared game engine from `@battleship/shared`
- In-memory storage (rooms are lost on server restart)
- Socket.IO v4 with CORS enabled for local development
