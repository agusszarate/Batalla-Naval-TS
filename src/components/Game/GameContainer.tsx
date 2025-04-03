import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Modal,
  Input,
  Tabs,
  Badge,
  Spin,
  Alert,
} from "antd";
import {
  ReloadOutlined,
  RocketOutlined,
  TrophyOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import GameBoard from "@/components/Board/GameBoard";
import { useGameStore } from "@/lib/store/gameStore";
import {
  Position,
  ShipOrientation,
  ShipType,
  SHIPS_CONFIG,
} from "@/lib/game-logic/types";
import { socketClient } from "@/lib/socket/socketClient";
import { useMessage } from "@/lib/AntdMessageContext";

const { Title, Text } = Typography;

interface GameContainerProps {
  isMultiplayer?: boolean;
  gameId?: string;
}

const GameContainer: React.FC<GameContainerProps> = ({
  isMultiplayer = false,
  gameId,
}) => {
  const messageApi = useMessage();
  const {
    game,
    playerId,
    createGame,
    joinGame,
    placeShip: placePlayerShip,
    randomizeShips,
    resetShips,
    readyToPlay,
    makeMove,
    isGameOver,
    getWinner,
    updateGameState,
    updatePlayerReady,
  } = useGameStore();

  const [playerName, setPlayerName] = useState("");
  const [joinGameId, setJoinGameId] = useState(gameId || "");
  const [showSetup, setShowSetup] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentShipType, setCurrentShipType] = useState<ShipType>("carrier");
  const [shipOrientation, setShipOrientation] =
    useState<ShipOrientation>("horizontal");
  const [isConnecting, setIsConnecting] = useState(false);

  // Get player and opponent from the game state
  const player = playerId
    ? game?.players.find((p) => p.id === playerId)
    : undefined;
  const opponent = playerId
    ? game?.players.find((p) => p.id !== playerId)
    : undefined;

  // Connect to the socket server when component mounts
  useEffect(() => {
    if (isMultiplayer) {
      socketClient.connect();
    }
    return () => {
      if (isMultiplayer) {
        socketClient.disconnect();
      }
    };
  }, [isMultiplayer]);

  // Join a game room when the game is created or joined
  useEffect(() => {
    if (isMultiplayer && game?.id) {
      socketClient.joinGame(game.id);

      // Listen for game updates
      const unsubscribeGameUpdate = socketClient.on(
        "gameUpdate",
        (updatedGame) => {
          // Update the local game state
          updateGameState(updatedGame);
        }
      );

      // Listen for player ready events
      const unsubscribePlayerReady = socketClient.on(
        "playerReady",
        (readyPlayerId) => {
          if (readyPlayerId !== playerId) {
            // Update the opponent's ready status
            updatePlayerReady(readyPlayerId, true);
          }
        }
      );

      // Listen for player moves
      const unsubscribePlayerMove = socketClient.on(
        "playerMove",
        (movePlayerId, position) => {
          if (movePlayerId !== playerId) {
            // Update the game state with the opponent's move
            makeMove(position);
          }
        }
      );

      return () => {
        unsubscribeGameUpdate();
        unsubscribePlayerReady();
        unsubscribePlayerMove();
        socketClient.leaveGame(game.id);
      };
    }
  }, [
    isMultiplayer,
    game?.id,
    playerId,
    updateGameState,
    updatePlayerReady,
    makeMove,
  ]);

  // Auto-join a game if gameId is provided as prop
  useEffect(() => {
    if (gameId && isMultiplayer && !game && playerName) {
      setIsConnecting(true);
      joinGame(gameId, playerName);
      setShowSetup(false);
      setIsConnecting(false);
    }
  }, [gameId, isMultiplayer, game, playerName, joinGame]);

  // Handle creating a new game
  const handleCreateGame = () => {
    if (!playerName.trim()) {
      messageApi.error("Please enter your name");
      return;
    }

    setIsConnecting(true);
    createGame(playerName);
    setShowSetup(false);

    if (isMultiplayer) {
      setShowInviteModal(true);
    }
    setIsConnecting(false);
  };

  // Handle joining an existing game
  const handleJoinGame = () => {
    if (!playerName.trim()) {
      messageApi.error("Please enter your name");
      return;
    }

    if (!joinGameId.trim()) {
      messageApi.error("Please enter a game ID");
      return;
    }

    setIsConnecting(true);
    joinGame(joinGameId, playerName);
    setShowSetup(false);
    setIsConnecting(false);
  };

  // Handle placing a ship on the board
  const handlePlaceShip = (position: Position) => {
    if (!currentShipType) return;

    const shipConfig = SHIPS_CONFIG[currentShipType];
    placePlayerShip(currentShipType, position, shipOrientation);

    // Move to the next ship type
    const shipTypes: ShipType[] = [
      "carrier",
      "battleship",
      "cruiser",
      "submarine",
      "destroyer",
    ];

    const currentIndex = shipTypes.indexOf(currentShipType);
    if (currentIndex < shipTypes.length - 1) {
      setCurrentShipType(shipTypes[currentIndex + 1]);
    } else {
      messageApi.success(
        "All ships placed! Click 'Ready to Play' when you're ready."
      );
    }
  };

  // Handle randomizing ship placements
  const handleRandomizeShips = () => {
    randomizeShips();
    messageApi.success(
      "Ships placed randomly! Click 'Ready to Play' when you're ready."
    );
  };

  // Handle ready to play
  const handleReadyToPlay = () => {
    readyToPlay();

    if (isMultiplayer && game?.id && playerId) {
      socketClient.playerReady(game.id, playerId);
      messageApi.info("Waiting for opponent to be ready...");
    } else {
      messageApi.success("Ready to play! Game will start soon.");
    }
  };

  // Handle making a move on the opponent's board
  const handleMakeMove = (position: Position) => {
    // Check if the cell has been attacked before
    const opponentCell = player?.opponentBoard.cells[position.y][position.x];
    if (
      opponentCell &&
      (opponentCell.status === "hit" || opponentCell.status === "miss")
    ) {
      messageApi.error("You've already attacked this position!");
      return;
    }

    makeMove(position);

    if (isMultiplayer && game?.id && playerId) {
      socketClient.makeMove(game.id, playerId, position);
    }
  };

  // Check if all ships are placed
  const allShipsPlaced = () => {
    if (!player) return false;

    // Count the total number of ships that should be placed
    const totalShips = Object.values(SHIPS_CONFIG).reduce(
      (total, config) => total + config.count,
      0
    );

    return player.board.ships.length === totalShips;
  };

  // Render the game setup screen
  if (showSetup) {
    return (
      <Card title="Batalla Naval - Game Setup" variant="borderless">
        <Row gutter={[16, 16]} justify="center">
          <Col span={24}>
            <Input
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{ marginBottom: 16 }}
            />
          </Col>

          {isMultiplayer ? (
            <Col span={24}>
              <Row gutter={16}>
                <Col span={12}>
                  <Button
                    type="primary"
                    block
                    onClick={handleCreateGame}
                    loading={isConnecting}
                  >
                    Create New Game
                  </Button>
                </Col>
                <Col span={12}>
                  <Tabs
                    defaultActiveKey="1"
                    items={[
                      {
                        key: "1",
                        label: "Join Game",
                        children: (
                          <>
                            <Input
                              placeholder="Enter Game ID"
                              value={joinGameId}
                              onChange={(e) => setJoinGameId(e.target.value)}
                              style={{ marginBottom: 16 }}
                            />
                            <Button
                              type="primary"
                              block
                              onClick={handleJoinGame}
                              loading={isConnecting}
                            >
                              Join Game
                            </Button>
                          </>
                        ),
                      },
                    ]}
                  />
                </Col>
              </Row>
            </Col>
          ) : (
            <Col span={24}>
              <Button
                type="primary"
                block
                onClick={handleCreateGame}
                loading={isConnecting}
              >
                Start Single Player Game
              </Button>
            </Col>
          )}
        </Row>
      </Card>
    );
  }

  // Show spinner while connecting
  if (isConnecting) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 20 }}>Connecting to game server...</p>
      </div>
    );
  }

  // Render the invite modal for multiplayer games
  const renderInviteModal = () => (
    <Modal
      title="Invite a Friend"
      open={showInviteModal}
      onCancel={() => setShowInviteModal(false)}
      footer={[
        <Button key="close" onClick={() => setShowInviteModal(false)}>
          Close
        </Button>,
      ]}
    >
      <p>Share this game ID with your friend to join:</p>
      <Row gutter={16}>
        <Col flex="auto">
          <Input value={game?.id} readOnly />
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard.writeText(game?.id || "");
              messageApi.success("Game ID copied to clipboard");
            }}
          >
            Copy
          </Button>
        </Col>
      </Row>

      <Alert
        style={{ marginTop: 16 }}
        message="Waiting for opponent to join..."
        description="Your opponent needs to join using this game ID. The game will start when both players have placed their ships and are ready."
        type="info"
        showIcon
      />
    </Modal>
  );

  // Render the ship placement screen
  if (game?.status === "waiting" || game?.status === "placing") {
    return (
      <Card
        title="Batalla Naval - Place Your Ships"
        variant="borderless"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={resetShips}
            disabled={player?.ready}
          >
            Reset Board
          </Button>
        }
      >
        {isMultiplayer && renderInviteModal()}

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <GameBoard
              board={player?.board || { cells: [], ships: [] }}
              allowPlacement={!player?.ready}
              placingShipType={player?.ready ? undefined : currentShipType}
              placingShipSize={
                player?.ready ? 0 : SHIPS_CONFIG[currentShipType].size
              }
              onCellClick={handlePlaceShip}
            />
          </Col>

          <Col xs={24} lg={8}>
            <Card title="Ship Placement">
              {player?.ready ? (
                <div>
                  <Alert
                    message="Ready!"
                    description={
                      opponent
                        ? opponent.ready
                          ? "Both players are ready! Game is starting..."
                          : "Waiting for your opponent to be ready..."
                        : "Waiting for opponent to join..."
                    }
                    type="success"
                    showIcon
                  />
                </div>
              ) : (
                <>
                  <p>
                    Place your ships on the board or use the randomize button.
                  </p>
                  <p>
                    Currently placing:{" "}
                    <strong>
                      {currentShipType.charAt(0).toUpperCase() +
                        currentShipType.slice(1)}
                    </strong>{" "}
                    ({SHIPS_CONFIG[currentShipType].size} cells)
                  </p>

                  <Button
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={handleRandomizeShips}
                    block
                    style={{ marginBottom: 16 }}
                  >
                    Randomize Ships
                  </Button>

                  <Button
                    type="primary"
                    icon={<RocketOutlined />}
                    onClick={handleReadyToPlay}
                    disabled={!allShipsPlaced()}
                    block
                  >
                    Ready to Play
                  </Button>
                </>
              )}

              {isMultiplayer && (
                <div style={{ marginTop: 16 }}>
                  <Title level={5}>Players:</Title>
                  <ul>
                    {game?.players.map((p) => (
                      <li key={p.id}>
                        {p.name} {p.ready ? "✅ (Ready)" : "⏳ (Not Ready)"}
                        {p.id === playerId ? " (You)" : ""}
                      </li>
                    ))}
                  </ul>

                  {game?.players.length === 1 && (
                    <Alert
                      message="Waiting for opponent"
                      description="Share the game ID with your friend to start playing"
                      type="info"
                      showIcon
                    />
                  )}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Card>
    );
  }

  // Render the gameplay screen
  const gameOver = isGameOver();
  const winner = getWinner();

  return (
    <Card
      title="Batalla Naval - Battle!"
      variant="borderless"
      extra={
        <Badge
          count={player?.turn ? "Your Turn" : "Opponent's Turn"}
          style={{ backgroundColor: player?.turn ? "#52c41a" : "#faad14" }}
        />
      }
    >
      {gameOver && (
        <Modal
          title={
            <div style={{ textAlign: "center" }}>
              <TrophyOutlined
                style={{ fontSize: 24, color: "#faad14", marginRight: 8 }}
              />
              Game Over!
            </div>
          }
          open={gameOver}
          footer={null}
          closable={false}
        >
          <div style={{ textAlign: "center", padding: 16 }}>
            <Title level={3}>
              {winner?.id === playerId ? "You Won!" : "You Lost!"}
            </Title>
            <Button type="primary" onClick={() => window.location.reload()}>
              Play Again
            </Button>
          </div>
        </Modal>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Title level={4} style={{ textAlign: "center" }}>
            Your Fleet
          </Title>
          <GameBoard
            board={player?.board || { cells: [], ships: [] }}
            isPlayerTurn={player?.turn || false}
          />
        </Col>

        <Col xs={24} md={12}>
          <Title level={4} style={{ textAlign: "center" }}>
            Opponent's Fleet
          </Title>
          <GameBoard
            board={opponent?.board || { cells: [], ships: [] }}
            isOpponentBoard
            onCellClick={handleMakeMove}
            isPlayerTurn={player?.turn || false}
          />
        </Col>
      </Row>

      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="Battle Stats" variant="outlined">
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Your ships sunk:</Text>{" "}
                {player?.board.ships.filter((s) => s.sunk).length || 0}/
                {player?.board.ships.length || 0}
              </Col>
              <Col span={12}>
                <Text strong>Opponent's ships sunk:</Text>{" "}
                {opponent?.board.ships.filter((s) => s.sunk).length || 0}/
                {opponent?.board.ships.length || 0}
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default GameContainer;
