require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { connectDB } = require('./src/models/db');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket connection logic
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 Client ${socket.id} joined room: ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Expose Socket.io instance on app to use in controllers if needed
app.set('io', io);

// Boot server
const startServer = async () => {
  // Connect to Database (with fallback checks)
  await connectDB();

  server.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 GreenHubRCA Backend running on port ${PORT}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`=============================================`);
  });
};

startServer().catch(err => {
  console.error('Fatal error during server startup:', err);
  process.exit(1);
});
