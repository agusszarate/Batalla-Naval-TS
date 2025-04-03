import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Board as BoardType,
  Cell as CellType,
  Position,
  ShipOrientation,
  ShipType,
  SHIPS_CONFIG,
  CellStatus,
} from "@/lib/game-logic/types";
import { Button, Tooltip } from "antd";
import { RotateLeftOutlined, RotateRightOutlined } from "@ant-design/icons";

interface GameBoardProps {
  board: BoardType;
  isOpponentBoard?: boolean;
  onCellClick?: (position: Position) => void;
  allowPlacement?: boolean;
  placingShipType?: ShipType;
  placingShipSize?: number;
  isPlayerTurn?: boolean;
}

// A simple 2D representation of a cell in the game board
const Cell = ({
  position,
  cell,
  isHovered,
  onClick,
  isOpponentView,
  isPlacingShip,
  placementValid = true,
}: {
  position: Position;
  cell: CellType;
  isHovered?: boolean;
  onClick: () => void;
  isOpponentView: boolean;
  isPlacingShip?: boolean;
  placementValid?: boolean;
}) => {
  // Define cell appearance based on status
  const getBackgroundColor = () => {
    if (isPlacingShip)
      return placementValid ? "rgba(0, 255, 0, 0.3)" : "rgba(255, 0, 0, 0.3)";
    if (isHovered) return "rgba(173, 216, 230, 0.8)";
    if (cell.status === "empty") return "#add8e6"; // Light blue for water
    if (cell.status === "ship" && !isOpponentView) return "#555555"; // Gray for ships (only on player's board)
    if (cell.status === "hit") return "#ff4d4d"; // Red for hits
    if (cell.status === "miss") return "#ffffff"; // White for misses
    return "#add8e6"; // Default light blue for water
  };

  const getCellContent = () => {
    if (cell.status === "hit") return "💥";
    if (cell.status === "miss") return "⚪";
    if (cell.status === "ship" && !isOpponentView) return "🚢";
    return "";
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: getBackgroundColor(),
        border: "1px solid #0077be",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "pointer",
        position: "relative",
        transition: "all 0.2s",
        fontSize: "1.5rem",
      }}
      onClick={onClick}
    >
      {getCellContent()}
      {/* Show coordinates on empty cells */}
      {cell.status === "empty" && !isHovered && !isPlacingShip && (
        <div
          style={{
            position: "absolute",
            fontSize: "0.6rem",
            bottom: "2px",
            right: "2px",
            color: "#0077be",
            fontWeight: "bold",
          }}
        >
          {`${String.fromCharCode(65 + position.x)}${position.y + 1}`}
        </div>
      )}
    </div>
  );
};

// Generate a default empty board for safety
const generateDefaultBoard = (): BoardType => {
  const cells = Array(10)
    .fill(null)
    .map((_, y) =>
      Array(10)
        .fill(null)
        .map((_, x) => ({
          position: { x, y },
          status: "empty" as CellStatus,
        }))
    );

  return { cells, ships: [] };
};

// The main GameBoard component with a 2D view from above
const GameBoard: React.FC<GameBoardProps> = ({
  board: propBoard,
  isOpponentBoard = false,
  onCellClick,
  allowPlacement = false,
  placingShipType,
  placingShipSize = 0,
  isPlayerTurn = true,
}) => {
  // Create a safe board object that always has cells even if prop is invalid
  const board = useMemo(
    () => (propBoard?.cells?.length ? propBoard : generateDefaultBoard()),
    [propBoard]
  );

  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null);
  const [orientation, setOrientation] = useState<ShipOrientation>("horizontal");
  const [placingShipPositions, setPlacingShipPositions] = useState<Position[]>(
    []
  );
  const [placementValid, setPlacementValid] = useState<boolean>(true);
  const [cellSize, setCellSize] = useState<number>(40); // Default cell size

  // Adjust cell size based on screen width - only on mount and window resize
  useEffect(() => {
    const updateCellSize = () => {
      const width = window.innerWidth;
      if (width < 400) {
        setCellSize(28); // Smaller for mobile
      } else if (width < 600) {
        setCellSize(32);
      } else {
        setCellSize(40); // Default
      }
    };

    updateCellSize();
    window.addEventListener("resize", updateCellSize);

    return () => {
      window.removeEventListener("resize", updateCellSize);
    };
  }, []); // Empty dependency array means this only runs on mount

  // Memoized function to check if a position is valid for ship placement
  const calculateShipPositions = useCallback(
    (hoverPos: Position | null) => {
      if (
        !hoverPos ||
        !placingShipType ||
        !allowPlacement ||
        placingShipSize <= 0
      ) {
        return { positions: [], valid: false };
      }

      const positions: Position[] = [];
      const { x, y } = hoverPos;
      let valid = true;

      for (let i = 0; i < placingShipSize; i++) {
        let newX = x;
        let newY = y;

        if (orientation === "horizontal") {
          newX = x + i;
          if (newX >= 10) {
            valid = false;
            break;
          }
        } else {
          newY = y + i;
          if (newY >= 10) {
            valid = false;
            break;
          }
        }

        // Check if position is already occupied by another ship
        if (board.cells[newY]?.[newX]?.status === "ship") {
          valid = false;
        }

        positions.push({ x: newX, y: newY });
      }

      // Check adjacent cells (ships cannot touch)
      if (valid) {
        for (const pos of positions) {
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const adjX = pos.x + dx;
              const adjY = pos.y + dy;

              // Skip if position is out of bounds
              if (
                adjX < 0 ||
                adjX >= 10 ||
                adjY < 0 ||
                adjY >= 10 ||
                // Skip the current position itself
                (dx === 0 && dy === 0)
              ) {
                continue;
              }

              // Check if adjacent cell has a ship
              if (
                board.cells[adjY]?.[adjX]?.status === "ship" &&
                !positions.some((p) => p.x === adjX && p.y === adjY)
              ) {
                valid = false;
                break;
              }
            }
            if (!valid) break;
          }
          if (!valid) break;
        }
      }

      return {
        positions,
        valid: valid && positions.length === placingShipSize,
      };
    },
    [orientation, placingShipType, placingShipSize, allowPlacement, board.cells]
  );

  // Update ship positions when hover position changes
  useEffect(() => {
    if (!hoveredPosition) {
      setPlacingShipPositions([]);
      return;
    }

    const result = calculateShipPositions(hoveredPosition);
    setPlacingShipPositions(result.positions);
    setPlacementValid(result.valid);
  }, [hoveredPosition, calculateShipPositions]);

  // Handle cell click
  const handleCellClick = useCallback(
    (position: Position) => {
      if (!onCellClick) return;

      if (
        allowPlacement &&
        placingShipPositions.length === placingShipSize &&
        placementValid
      ) {
        onCellClick(position);
      } else if (!allowPlacement && isPlayerTurn) {
        onCellClick(position);
      }
    },
    [
      onCellClick,
      allowPlacement,
      placingShipPositions.length,
      placingShipSize,
      placementValid,
      isPlayerTurn,
    ]
  );

  // Toggle ship orientation
  const toggleOrientation = useCallback(() => {
    setOrientation((prev) =>
      prev === "horizontal" ? "vertical" : "horizontal"
    );
  }, []);

  // Mouse enter handler
  const handleMouseEnter = useCallback((x: number, y: number) => {
    setHoveredPosition({ x, y });
  }, []);

  // Mouse leave handler
  const handleMouseLeave = useCallback(() => {
    setHoveredPosition(null);
  }, []);

  // Create a memoized grid of cells to avoid unnecessary re-renders
  const boardCells = useMemo(
    () =>
      Array(10)
        .fill(0)
        .map((_, y) =>
          Array(10)
            .fill(0)
            .map((_, x) => {
              const cell = board.cells[y]?.[x] || {
                position: { x, y },
                status: "empty" as CellStatus,
              };
              const isHovered =
                hoveredPosition?.x === x && hoveredPosition?.y === y;
              const isPlacingShip = placingShipPositions.some(
                (p) => p.x === x && p.y === y
              );

              return (
                <div
                  key={`cell-${x}-${y}`}
                  style={{
                    gridColumn: x + 2,
                    gridRow: y + 2,
                    width: "100%",
                    height: "100%",
                  }}
                  onMouseEnter={() => handleMouseEnter(x, y)}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={() => handleMouseEnter(x, y)}
                >
                  <Cell
                    position={{ x, y }}
                    cell={cell}
                    isHovered={isHovered && !isPlacingShip}
                    onClick={() => handleCellClick({ x, y })}
                    isOpponentView={isOpponentBoard}
                    isPlacingShip={isPlacingShip}
                    placementValid={placementValid}
                  />
                </div>
              );
            })
        )
        .flat(),
    [
      board.cells,
      hoveredPosition,
      placingShipPositions,
      handleMouseEnter,
      handleMouseLeave,
      handleCellClick,
      isOpponentBoard,
      placementValid,
    ]
  );

  return (
    <div
      className="game-board-container"
      style={{
        width: "100%",
        maxWidth: `${cellSize * 11 + 20}px`, // Adjust based on cell size
        margin: "0 auto",
        position: "relative",
        overflow: "auto", // Allow scrolling if necessary
      }}
    >
      <div
        className="game-board-title"
        style={{
          textAlign: "center",
          margin: "10px 0",
          color: isOpponentBoard ? "#ff4d4d" : "#0077be",
          fontWeight: "bold",
        }}
      >
        {isOpponentBoard ? "Opponent's Waters" : "Your Fleet"}
        {!isPlayerTurn && isOpponentBoard && (
          <div
            style={{
              backgroundColor: "#ffe0e0",
              padding: "5px",
              borderRadius: "5px",
              marginTop: "5px",
            }}
          >
            Waiting for opponent's move...
          </div>
        )}
        {allowPlacement && placingShipType && (
          <div
            style={{
              backgroundColor: "#e0f0ff",
              padding: "5px",
              borderRadius: "5px",
              marginTop: "5px",
            }}
          >
            Placing:{" "}
            {placingShipType.charAt(0).toUpperCase() + placingShipType.slice(1)}{" "}
            ({placingShipSize} cells)
          </div>
        )}
      </div>

      <div
        className="game-board"
        style={{
          display: "grid",
          gridTemplateColumns: `${cellSize / 2}px repeat(10, ${cellSize}px)`,
          gridTemplateRows: `${cellSize / 2}px repeat(10, ${cellSize}px)`,
          gap: "0px",
          position: "relative",
          backgroundColor: "#f0f8ff", // Light background color for the entire grid
        }}
      >
        {/* Corner cell (empty) */}
        <div
          style={{
            gridColumn: 1,
            gridRow: 1,
            borderBottom: "1px solid #0077be",
            borderRight: "1px solid #0077be",
          }}
        ></div>

        {/* Column labels (A-J) */}
        {Array(10)
          .fill(0)
          .map((_, i) => (
            <div
              key={`col-${i}`}
              style={{
                gridColumn: i + 2,
                gridRow: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: "bold",
                color: "#0077be",
                fontSize: `${cellSize / 3}px`,
                borderBottom: "1px solid #0077be",
              }}
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}

        {/* Row labels (1-10) */}
        {Array(10)
          .fill(0)
          .map((_, i) => (
            <div
              key={`row-${i}`}
              style={{
                gridColumn: 1,
                gridRow: i + 2,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontWeight: "bold",
                color: "#0077be",
                fontSize: `${cellSize / 3}px`,
                borderRight: "1px solid #0077be",
              }}
            >
              {i + 1}
            </div>
          ))}

        {/* Board cells */}
        {boardCells}

        {/* Ship placement controls */}
        {allowPlacement && (
          <div
            style={{
              position: "absolute",
              bottom: `-${cellSize + 10}px`,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              zIndex: 20,
            }}
          >
            <Tooltip title="Rotate ship">
              <Button
                type="primary"
                shape="circle"
                icon={
                  orientation === "horizontal" ? (
                    <RotateRightOutlined />
                  ) : (
                    <RotateLeftOutlined />
                  )
                }
                onClick={toggleOrientation}
              />
            </Tooltip>
          </div>
        )}

        {/* Coordinates display */}
        {hoveredPosition && (
          <div
            style={{
              position: "absolute",
              top: `-${cellSize / 2 + 5}px`,
              right: "0",
              background: "rgba(0, 0, 0, 0.6)",
              color: "white",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              zIndex: 30,
            }}
          >
            Coordinates: {String.fromCharCode(65 + hoveredPosition.x)}
            {hoveredPosition.y + 1}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
