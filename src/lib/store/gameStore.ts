import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  GameState,
  Player,
  Position,
  ShipOrientation,
  ShipType,
  SHIPS_CONFIG,
} from "../game-logic/types";
import {
  attackPosition,
  initializeBoard,
  placeShip,
} from "../game-logic/board";

interface GameStore {
  game: GameState | null;
  playerId: string | null;

  // Game Creation
  createGame: (playerName: string) => void;
  joinGame: (gameId: string, playerName: string) => void;

  // Ship Placement
  placeShip: (
    shipType: ShipType,
    position: Position,
    orientation: ShipOrientation
  ) => void;

  randomizeShips: () => void;
  resetShips: () => void;
  readyToPlay: () => void;

  // Game Play
  makeMove: (position: Position) => void;

  // Game Status
  isGameOver: () => boolean;
  getWinner: () => Player | null;

  // Socket updates
  updateGameState: (updatedGame: GameState) => void;
  updatePlayerReady: (playerId: string, isReady: boolean) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  playerId: null,

  createGame: (playerName: string) => {
    const playerId = uuidv4();
    const gameId = uuidv4();

    const player: Player = {
      id: playerId,
      name: playerName,
      board: initializeBoard(),
      opponentBoard: initializeBoard(),
      ready: false,
      turn: true, // Creator goes first
    };

    const game: GameState = {
      id: gameId,
      players: [player],
      status: "waiting",
    };

    set({ game, playerId });
  },

  joinGame: (gameId: string, playerName: string) => {
    const playerId = uuidv4();

    const player: Player = {
      id: playerId,
      name: playerName,
      board: initializeBoard(),
      opponentBoard: initializeBoard(),
      ready: false,
      turn: false,
    };

    set((state) => {
      if (!state.game) return state;

      return {
        game: {
          ...state.game,
          players: [...state.game.players, player],
          status: "placing",
        },
        playerId,
      };
    });
  },

  placeShip: (
    shipType: ShipType,
    position: Position,
    orientation: ShipOrientation
  ) => {
    const { game, playerId } = get();
    if (!game || !playerId) return;

    const playerIndex = game.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return;

    const player = game.players[playerIndex];
    const shipConfig = SHIPS_CONFIG[shipType];

    const updatedBoard = placeShip(
      player.board,
      position,
      shipType,
      shipConfig.size,
      orientation
    );

    const updatedPlayers = [...game.players];
    updatedPlayers[playerIndex] = {
      ...player,
      board: updatedBoard,
    };

    set({
      game: {
        ...game,
        players: updatedPlayers,
      },
    });
  },

  randomizeShips: () => {
    const { game, playerId } = get();
    if (!game || !playerId) return;

    const playerIndex = game.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return;

    // Reset board first
    let board = initializeBoard();

    // Place ships randomly
    Object.entries(SHIPS_CONFIG).forEach(([shipType, config]) => {
      for (let i = 0; i < config.count; i++) {
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 100) {
          attempts++;

          // Generate random position and orientation
          const x = Math.floor(Math.random() * 10);
          const y = Math.floor(Math.random() * 10);
          const orientation = Math.random() > 0.5 ? "horizontal" : "vertical";

          // Try to place the ship
          const updatedBoard = placeShip(
            board,
            { x, y },
            shipType as ShipType,
            config.size,
            orientation
          );

          if (updatedBoard) {
            board = updatedBoard;
            placed = true;
          }
        }
      }
    });

    const updatedPlayers = [...game.players];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      board,
    };

    set({
      game: {
        ...game,
        players: updatedPlayers,
      },
    });
  },

  resetShips: () => {
    const { game, playerId } = get();
    if (!game || !playerId) return;

    const playerIndex = game.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return;

    const updatedPlayers = [...game.players];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      board: initializeBoard(),
      ready: false,
    };

    set({
      game: {
        ...game,
        players: updatedPlayers,
      },
    });
  },

  readyToPlay: () => {
    const { game, playerId } = get();
    if (!game || !playerId) return;

    const playerIndex = game.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return;

    const updatedPlayers = [...game.players];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      ready: true,
    };

    let gameStatus = game.status;

    // If all players are ready, start the game
    if (updatedPlayers.every((p) => p.ready) && updatedPlayers.length > 1) {
      gameStatus = "playing";
    }

    set({
      game: {
        ...game,
        players: updatedPlayers,
        status: gameStatus,
      },
    });
  },

  makeMove: (position: Position) => {
    const { game, playerId } = get();
    if (!game || !playerId || game.status !== "playing") return;

    const playerIndex = game.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1 || !game.players[playerIndex].turn) return;

    const opponent = game.players.find((p) => p.id !== playerId);
    if (!opponent) return;

    const { board, hit, sunkShip } = attackPosition(opponent.board, position);

    // Update opponent's board
    const updatedPlayers = game.players.map((p) => {
      if (p.id === opponent.id) {
        return {
          ...p,
          board,
          turn: hit ? false : true, // If hit, current player goes again
        };
      }

      if (p.id === playerId) {
        // Update current player's view of opponent's board
        const updatedOpponentBoard = { ...p.opponentBoard };
        const cell = updatedOpponentBoard.cells[position.y][position.x];
        cell.status = hit ? "hit" : "miss";

        // If a ship was sunk, update the ship in the opponentBoard
        if (sunkShip) {
          const opponentShipIndex = updatedOpponentBoard.ships.findIndex(
            (s) => s.id === sunkShip.id
          );
          if (opponentShipIndex !== -1) {
            updatedOpponentBoard.ships[opponentShipIndex] = sunkShip;
          } else {
            updatedOpponentBoard.ships.push(sunkShip);
          }
        }

        return {
          ...p,
          opponentBoard: updatedOpponentBoard,
          turn: hit ? true : false, // If hit, current player goes again
        };
      }

      return p;
    });

    // Check if game is over
    const allShipsSunk = board.ships.every((s) => s.sunk);

    // Create updated game state
    const updatedGame: GameState = {
      ...game,
      players: updatedPlayers,
      // If all ships are sunk, set status to finished, otherwise keep current status
      status: allShipsSunk ? "finished" : game.status,
      // If all ships are sunk, set winner, otherwise keep current winner
      winner: allShipsSunk ? playerId : game.winner,
    };

    set({ game: updatedGame });
  },

  isGameOver: () => {
    const { game } = get();
    return game?.status === "finished";
  },

  getWinner: () => {
    const { game } = get();
    if (!game || game.status !== "finished" || !game.winner) return null;

    return game.players.find((p) => p.id === game.winner) || null;
  },

  // New methods for socket updates
  updateGameState: (updatedGame: GameState) => {
    const { playerId } = get();
    set({ game: updatedGame });
  },

  updatePlayerReady: (readyPlayerId: string, isReady: boolean) => {
    const { game } = get();
    if (!game) return;

    const updatedPlayers = game.players.map((player) => {
      if (player.id === readyPlayerId) {
        return {
          ...player,
          ready: isReady,
        };
      }
      return player;
    });

    let gameStatus = game.status;
    // If all players are ready, start the game
    if (updatedPlayers.every((p) => p.ready) && updatedPlayers.length > 1) {
      gameStatus = "playing";
    }

    set({
      game: {
        ...game,
        players: updatedPlayers,
        status: gameStatus,
      },
    });
  },
}));
