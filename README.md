# Battleship Web App

A real-time multiplayer Battleship game built with React, Node.js, and Socket.IO.

## Project Structure

```
battleship-test/
├── packages/
│   ├── client/          # React + TypeScript + Vite frontend
│   ├── server/          # Express + Socket.IO backend
│   └── shared/          # Shared types and constants
```

## Setup

Install all dependencies:

```bash
npm install
```

## Development

Run both client and server concurrently:

```bash
npm run dev
```

This will start:
- Client (Vite) on http://localhost:5173
- Server (Express) on http://localhost:3001

Or run them separately:

```bash
npm run dev:client  # Client only
npm run dev:server  # Server only
```

## Build

Build all packages:

```bash
npm run build
```

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, Socket.IO
- **Monorepo:** npm workspaces
- **Shared:** TypeScript types and constants

## Game Constants

- Board Size: 10x10
- Ships:
  - Carrier (5)
  - Battleship (4)
  - Cruiser (3)
  - Submarine (3)
  - Destroyer (2)
