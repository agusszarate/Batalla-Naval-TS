import { io, Socket } from "socket.io-client";
import { GameState, Position } from "../game-logic/types";

class SocketClient {
  private socket: Socket | null = null;
  private callbacks: Record<string, ((...args: any[]) => void)[]> = {};

  // Initialize the socket connection
  connect() {
    if (this.socket) return;

    // Ping the server first to ensure it's initialized
    fetch("/api/socket", { method: "GET", cache: "no-store" })
      .then(() => {
        console.log("Socket server ping successful, initializing connection");
        this.initializeSocket();
      })
      .catch((err) => {
        console.error("Socket server ping failed:", err);
        // Try to connect directly anyway
        this.initializeSocket();
      });
  }

  private initializeSocket() {
    // Create socket connection with direct URL instead of path
    const protocol = window.location.protocol.includes("https") ? "wss" : "ws";
    const host = window.location.host;

    this.socket = io(`${window.location.protocol}//${host}`, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection event handlers
    this.socket.on("connect", () => {
      console.log("Connected to socket server");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from socket server");
    });

    // Game events
    this.socket.on("game-update", (gameState: GameState) => {
      this.trigger("gameUpdate", gameState);
    });

    this.socket.on("player-ready", (playerId: string) => {
      this.trigger("playerReady", playerId);
    });

    this.socket.on("player-move", (playerId: string, position: Position) => {
      this.trigger("playerMove", playerId, position);
    });

    this.socket.on("chat-message", (message: any) => {
      this.trigger("chatMessage", message);
    });
  }

  // Join a specific game room
  joinGame(gameId: string) {
    if (!this.socket) {
      this.connect();
    }

    this.socket?.emit("join-game", gameId);
  }

  // Leave a game room
  leaveGame(gameId: string) {
    this.socket?.emit("leave-game", gameId);
  }

  // Update game state
  updateGameState(gameId: string, gameState: GameState) {
    this.socket?.emit("game-update", gameId, gameState);
  }

  // Notify player is ready
  playerReady(gameId: string, playerId: string) {
    this.socket?.emit("player-ready", gameId, playerId);
  }

  // Make a move
  makeMove(gameId: string, playerId: string, position: Position) {
    this.socket?.emit("player-move", gameId, playerId, position);
  }

  // Send a chat message
  sendMessage(gameId: string, message: any) {
    this.socket?.emit("chat-message", gameId, message);
  }

  // Register event listeners
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }

    this.callbacks[event].push(callback);

    return () => {
      this.callbacks[event] = this.callbacks[event].filter(
        (cb) => cb !== callback
      );
    };
  }

  // Trigger registered callbacks for an event
  private trigger(event: string, ...args: any[]) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach((callback) => callback(...args));
    }
  }

  // Disconnect from the socket server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.callbacks = {};
    }
  }
}

// Create a singleton instance
export const socketClient = new SocketClient();
