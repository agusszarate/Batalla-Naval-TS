# Battleship - Multiplayer Game

A multiplayer Battleship game implemented with TypeScript, Socket.IO, and Express.

## Features

-   Intuitive user interface for placing ships and playing
-   Room system for private matches
-   Real-time communication using Socket.IO
-   Fully implemented in TypeScript

## Available Ships

-   Aircraft Carrier (5 cells)
-   Battleship (4 cells)
-   Cruiser (3 cells)
-   Submarine (3 cells)
-   Destroyer (2 cells)

## Requirements

-   Node.js (v14 or higher)
-   npm

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd batalla-naval-ts
```

2. Install dependencies:

```bash
npm install
```

## Running the Game

To run the game in development mode:

```bash
npm run dev
```

To build and run in production:

```bash
npm run build
npm start
```

The server will be available at http://localhost:3000

## How to Play

1. Open the application in your browser
2. Enter your name and create a new room or join an existing one with a code
3. When there are two players, start the game
4. Place your ships on the board (you can use the "Rotate ship" button to change orientation)
5. Attack the enemy board taking turns
6. The first player to sink all of the opponent's ships wins

## Project Structure

```
├── src/
│   ├── client/          # Client code
│   │   ├── public/      # Static files (HTML, CSS)
│   │   └── index.ts     # Client entry point
│   ├── server/          # Server code
│   │   ├── server.ts    # Express and Socket.IO server configuration
│   │   └── game-manager.ts  # Game logic
│   └── shared/          # Shared code
│       └── types.ts     # Shared interfaces and types
├── dist/                # Compiled code (generated)
├── package.json
└── tsconfig.json
```
