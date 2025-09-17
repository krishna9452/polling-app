const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const userRoutes = require('./routes/user');
const pollRoutes = require('./routes/poll');
const voteRoutes = require('./routes/vote');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connections store
const connections = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Root route - serve the main application
app.get('/', (req, res) => {
  res.json({ 
    message: 'Polling API Server is running!',
    endpoints: {
      users: '/api/users',
      polls: '/api/polls',
      votes: '/api/votes',
      web_app: '/app'
    },
    documentation: {
      register: 'POST /api/users/register',
      login: 'POST /api/users/login',
      create_poll: 'POST /api/polls',
      get_polls: 'GET /api/polls',
      vote: 'POST /api/votes'
    }
  });
});

// Route to serve the web application
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/votes', voteRoutes);

// WebSocket connection handling
wss.on('connection', (ws, request) => {
  console.log('WebSocket connection established');
  
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pollId = url.searchParams.get('pollId');
  
  if (pollId) {
    // Specific poll connection
    console.log(`WebSocket client connected to poll: ${pollId}`);
    
    if (!connections.has(pollId)) {
      connections.set(pollId, new Set());
    }
    
    connections.get(pollId).add(ws);
    
    ws.send(JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      pollId: pollId,
      message: 'Connected to real-time updates for this poll'
    }));
  } else {
    // General connection (listen to all polls)
    console.log('WebSocket client connected for general updates');
    
    // Store general connections under a special key
    if (!connections.has('general')) {
      connections.set('general', new Set());
    }
    
    connections.get('general').add(ws);
    
    ws.send(JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      message: 'Connected for general updates'
    }));
  }

  ws.on('message', (message) => {
    console.log('Received WebSocket message:', message.toString());
    
    // Echo message back for testing
    ws.send(JSON.stringify({
      type: 'MESSAGE_ECHO',
      message: message.toString(),
      timestamp: new Date().toISOString()
    }));
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    
    // Remove from all connection sets
    connections.forEach((clients, key) => {
      if (clients.has(ws)) {
        clients.delete(ws);
        if (clients.size === 0) {
          connections.delete(key);
        }
      }
    });
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Function to broadcast updates to all clients watching a specific poll
const broadcastPollUpdate = (pollId, data) => {
  const message = JSON.stringify({
    ...data,
    timestamp: new Date().toISOString()
  });

  // Broadcast to specific poll connections
  if (connections.has(pollId)) {
    connections.get(pollId).forEach((client, index) => {
      if (client.readyState === 1) { // 1 means OPEN
        client.send(message);
        console.log(`Broadcasted update to poll-specific client ${index} for poll ${pollId}`);
      }
    });
  }

  // Broadcast to general connections
  if (connections.has('general')) {
    connections.get('general').forEach((client, index) => {
      if (client.readyState === 1) {
        client.send(message);
        console.log(`Broadcasted update to general client ${index} for poll ${pollId}`);
      }
    });
  }

  console.log(`Broadcasted update for poll ${pollId}`);
};

// Make broadcast function available globally
global.broadcastPollUpdate = broadcastPollUpdate;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    websocketConnections: Array.from(connections.entries()).reduce((acc, [key, clients]) => {
      acc[key] = clients.size;
      return acc;
    }, {}),
    totalConnections: Array.from(connections.values()).reduce((sum, clients) => sum + clients.size, 0)
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Catch-all handler for SPA routing (serve index.html for any other GET request)
app.get('*', (req, res) => {
  if (req.accepts('html')) {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  } else if (req.accepts('json')) {
    res.status(404).json({ error: 'Not found' });
  } else {
    res.status(404).send('Not found');
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  
  // Close all WebSocket connections
  connections.forEach((clients) => {
    clients.forEach(client => {
      client.close();
    });
  });
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };