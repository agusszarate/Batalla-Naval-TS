// Types for the Batalla Naval game

export type CellStatus = "empty" | "ship" | "hit" | "miss";

export type ShipType =
  | "carrier"
  | "battleship"
  | "cruiser"
  | "submarine"
  | "destroyer";

export type ShipOrientation = "horizontal" | "vertical";

export interface Ship {
  id: string;
  type: ShipType;
  size: number;
  positions: Position[];
  hits: number;
  sunk: boolean;
  orientation: ShipOrientation; // Added orientation to Ship type
}

export interface Position {
  x: number;
  y: number;
}

export interface Cell {
  position: Position;
  status: CellStatus;
  shipId?: string;
}

export interface Board {
  cells: Cell[][];
  ships: Ship[];
}

export interface Player {
  id: string;
  name: string;
  board: Board;
  opponentBoard: Board;
  ready: boolean;
  turn: boolean;
}

export interface GameState {
  id: string;
  players: Player[];
  status: "waiting" | "placing" | "playing" | "finished";
  winner?: string;
}

export const SHIPS_CONFIG = {
  carrier: { size: 5, count: 1 },
  battleship: { size: 4, count: 1 },
  cruiser: { size: 3, count: 1 },
  submarine: { size: 3, count: 1 },
  destroyer: { size: 2, count: 1 },
};

export const BOARD_SIZE = 10;
