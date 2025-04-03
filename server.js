const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize Socket.io server
  const io = new Server(server, {
    cors: {
      origin: dev ? `http://${hostname}:${port}` : '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket.io event handlers
  io.on('connection', (socket) => {
    console.log(`Socket ${socket.id} connected`);
    
    // Join a game room
    socket.on('join-game', (gameId) => {
      socket.join(gameId);
      console.log(`Socket ${socket.id} joined game ${gameId}`);
    });
    
    // Leave a game room
    socket.on('leave-game', (gameId) => {
      socket.leave(gameId);
      console.log(`Socket ${socket.id} left game ${gameId}`);
    });
    
    // Game state update
    socket.on('game-update', (gameId, gameState) => {
      socket.to(gameId).emit('game-update', gameState);
    });
    
    // Player ready
    socket.on('player-ready', (gameId, playerId) => {
      socket.to(gameId).emit('player-ready', playerId);
    });
    
    // Player made a move
    socket.on('player-move', (gameId, playerId, position) => {
      socket.to(gameId).emit('player-move', playerId, position);
    });
    
    // Chat message
    socket.on('chat-message', (gameId, message) => {
      socket.to(gameId).emit('chat-message', message);
    });
    
    // Disconnection
    socket.on('disconnect', () => {
      console.log(`Socket ${socket.id} disconnected`);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});