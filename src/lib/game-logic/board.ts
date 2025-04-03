import { v4 as uuidv4 } from "uuid";
import {
  Board,
  Cell,
  Position,
  Ship,
  ShipOrientation,
  ShipType,
  BOARD_SIZE,
} from "./types";

// Initialize an empty game board
export const initializeBoard = (): Board => {
  const cells: Cell[][] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    cells[y] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      cells[y][x] = {
        position: { x, y },
        status: "empty",
      };
    }
  }
  return {
    cells,
    ships: [],
  };
};

// Check if position is within board boundaries
export const isPositionWithinBounds = (position: Position): boolean => {
  const { x, y } = position;
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
};

// Get all positions a ship would occupy
export const getShipPositions = (
  position: Position,
  size: number,
  orientation: ShipOrientation
): Position[] => {
  const positions: Position[] = [];
  const { x, y } = position;

  for (let i = 0; i < size; i++) {
    const newX = orientation === "horizontal" ? x + i : x;
    const newY = orientation === "vertical" ? y + i : y;
    positions.push({ x: newX, y: newY });
  }

  return positions;
};

// Get adjacent positions to check for ship proximity
export const getAdjacentPositions = (positions: Position[]): Position[] => {
  const adjacentPositions: Position[] = [];
  const positionsSet = new Set(positions.map((p) => `${p.x},${p.y}`));

  for (const position of positions) {
    const { x, y } = position;

    // Check all 8 adjacent positions
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip the position itself

        const adjX = x + dx;
        const adjY = y + dy;
        const adjKey = `${adjX},${adjY}`;

        if (
          isPositionWithinBounds({ x: adjX, y: adjY }) &&
          !positionsSet.has(adjKey) &&
          !adjacentPositions.some((p) => p.x === adjX && p.y === adjY)
        ) {
          adjacentPositions.push({ x: adjX, y: adjY });
        }
      }
    }
  }

  return adjacentPositions;
};

// Check if a ship can be placed at the given position with the given orientation
export const canPlaceShip = (
  board: Board,
  position: Position,
  shipType: ShipType,
  size: number,
  orientation: ShipOrientation
): boolean => {
  // Get positions the ship would occupy
  const shipPositions = getShipPositions(position, size, orientation);

  // Check if all positions are within bounds
  if (shipPositions.some((p) => !isPositionWithinBounds(p))) {
    return false;
  }

  // Check if any of the ship positions or their adjacent cells are already occupied
  for (const pos of shipPositions) {
    // Check if current position is already occupied
    if (board.cells[pos.y][pos.x].status === "ship") {
      return false;
    }
  }

  // Check adjacent cells (no ship should be adjacent to another)
  const adjacentPositions = getAdjacentPositions(shipPositions);

  for (const adjPos of adjacentPositions) {
    if (board.cells[adjPos.y][adjPos.x].status === "ship") {
      return false;
    }
  }

  return true;
};

// Place a ship on the board
export const placeShip = (
  board: Board,
  position: Position,
  shipType: ShipType,
  size: number,
  orientation: ShipOrientation
): Board => {
  if (!canPlaceShip(board, position, shipType, size, orientation)) {
    return board; // Return unchanged if placement is invalid
  }

  const shipId = uuidv4();
  const shipPositions = getShipPositions(position, size, orientation);
  const newBoard = {
    ...board,
    cells: [...board.cells.map((row) => [...row])], // Deep copy cells
    ships: [...board.ships],
  };

  // Update cells with ship info
  for (const pos of shipPositions) {
    newBoard.cells[pos.y][pos.x] = {
      position: pos,
      status: "ship",
      shipId,
    };
  }

  // Add the ship to the board
  const ship: Ship = {
    id: shipId,
    type: shipType,
    size,
    positions: shipPositions,
    hits: 0,
    sunk: false,
    orientation,
  };

  newBoard.ships.push(ship);
  return newBoard;
};

// Check if there is a ship at the position
export const hasShipAtPosition = (
  board: Board,
  position: Position
): boolean => {
  if (!isPositionWithinBounds(position)) return false;
  return board.cells[position.y][position.x].status === "ship";
};

// Find a ship by id
export const findShipById = (
  board: Board,
  shipId: string
): Ship | undefined => {
  return board.ships.find((ship) => ship.id === shipId);
};

// Get the ship at a specific position
export const getShipAtPosition = (
  board: Board,
  position: Position
): Ship | undefined => {
  if (!isPositionWithinBounds(position)) return undefined;

  const cell = board.cells[position.y][position.x];
  if (cell.status !== "ship" && cell.status !== "hit") return undefined;

  return board.ships.find((ship) => ship.id === cell.shipId);
};

// Attack a position on the board
export const attackPosition = (
  board: Board,
  position: Position
): { board: Board; hit: boolean; sunkShip?: Ship } => {
  if (!isPositionWithinBounds(position)) {
    return { board, hit: false };
  }

  const { x, y } = position;
  const newBoard = {
    ...board,
    cells: [...board.cells.map((row) => [...row])], // Deep copy cells
    ships: [...board.ships.map((ship) => ({ ...ship }))], // Deep copy ships
  };

  const cell = newBoard.cells[y][x];

  // If the cell is already hit or missed, do nothing
  if (cell.status === "hit" || cell.status === "miss") {
    return { board: newBoard, hit: false };
  }

  if (cell.status === "ship") {
    // It's a hit
    cell.status = "hit";

    // Update the ship's hit count
    const ship = newBoard.ships.find((s) => s.id === cell.shipId);
    if (ship) {
      ship.hits += 1;

      // Check if the ship is sunk
      if (ship.hits === ship.size) {
        ship.sunk = true;
        return { board: newBoard, hit: true, sunkShip: ship };
      }
    }

    return { board: newBoard, hit: true };
  } else {
    // It's a miss
    cell.status = "miss";
    return { board: newBoard, hit: false };
  }
};

// Check if all ships are sunk
export const areAllShipsSunk = (board: Board): boolean => {
  return board.ships.every((ship) => ship.sunk);
};
