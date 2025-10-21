import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { validateSession } from './authService';
import { prisma } from '../db/prisma';

// Store connected clients
const clients = new Map<string, Set<WebSocket>>();

// Store user sessions
const userSessions = new WeakMap<WebSocket, { userId: string; areaIds: string[] }>();

// Store WebSocket server instance
let wss: WebSocketServer | null = null;

export interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: string;
}

/**
 * Initialize WebSocket server
 */
export function initializeWebSocketServer(server: any) {
  wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade to WebSocket
  server.on('upgrade', async (request: IncomingMessage, socket: any, head: Buffer) => {
    if (request.url?.startsWith('/api/ws')) {
      try {
        // Extract session ID from URL query params
        const url = new URL(request.url, `http://${request.headers.host}`);
        const sessionId = url.searchParams.get('sessionId');

        if (!sessionId) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Validate session
        const session = await validateSession(sessionId);
        if (!session) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Get user's accessible areas
        const userAreas = await prisma.userArea.findMany({
          where: { userId: session.user.id },
          select: { areaId: true },
        });

        const areaIds = userAreas.map((ua) => ua.areaId);

        // Upgrade connection
        wss.handleUpgrade(request, socket, head, (ws) => {
          // Store session data
          userSessions.set(ws, {
            userId: session.user.id,
            areaIds,
          });

          wss.emit('connection', ws, request);
        });
      } catch (error) {
        console.error('WebSocket auth error:', error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
    } else {
      socket.destroy();
    }
  });

  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    const sessionData = userSessions.get(ws);
    if (!sessionData) {
      ws.close();
      return;
    }

    const { userId, areaIds } = sessionData;

    // Register client for each area
    areaIds.forEach((areaId) => {
      if (!clients.has(areaId)) {
        clients.set(areaId, new Set());
      }
      clients.get(areaId)!.add(ws);
    });

    // Send connection confirmation
    ws.send(
      JSON.stringify({
        type: 'connected',
        data: {
          userId,
          areaIds,
          message: 'WebSocket connection established',
        },
        timestamp: new Date().toISOString(),
      })
    );

    console.log(`WebSocket client connected: user=${userId}, areas=${areaIds.length}`);

    // Handle ping/pong for keepalive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000); // Every 30 seconds

    ws.on('pong', () => {
      // Client is alive
    });

    // Handle messages from client
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message received:', message);

        // Handle different message types
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      clearInterval(pingInterval);

      // Remove client from all areas
      areaIds.forEach((areaId) => {
        const areaClients = clients.get(areaId);
        if (areaClients) {
          areaClients.delete(ws);
          if (areaClients.size === 0) {
            clients.delete(areaId);
          }
        }
      });

      console.log(`WebSocket client disconnected: user=${userId}`);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return wss;
}

/**
 * Broadcast event to all clients in specific areas
 */
export function broadcastToAreas(areaIds: string[], event: RealtimeEvent) {
  const message = JSON.stringify(event);

  areaIds.forEach((areaId) => {
    const areaClients = clients.get(areaId);
    if (areaClients) {
      areaClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  });

  console.log(`Broadcasted ${event.type} to ${areaIds.length} area(s)`);
}

/**
 * Broadcast event to all connected clients
 */
export function broadcastToAll(event: RealtimeEvent) {
  const message = JSON.stringify(event);
  let count = 0;

  clients.forEach((areaClients) => {
    areaClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        count++;
      }
    });
  });

  console.log(`Broadcasted ${event.type} to ${count} client(s)`);
}

/**
 * Get connection statistics
 */
export function getWebSocketStats() {
  let totalConnections = 0;
  clients.forEach((areaClients) => {
    totalConnections += areaClients.size;
  });

  return {
    totalAreas: clients.size,
    totalConnections,
    areasWithClients: Array.from(clients.keys()),
  };
}

/**
 * Close WebSocket server gracefully
 */
export async function closeWebSocketServer(): Promise<void> {
  if (!wss) {
    return;
  }

  return new Promise((resolve) => {
    // Close all client connections
    clients.forEach((areaClients) => {
      areaClients.forEach((client) => {
        try {
          client.close(1000, 'Server shutting down');
        } catch (err) {
          console.error('Error closing WebSocket client:', err);
        }
      });
    });

    // Clear clients map
    clients.clear();

    // Close WebSocket server
    wss!.close(() => {
      wss = null;
      resolve();
    });

    // Force close after timeout
    setTimeout(() => {
      wss = null;
      resolve();
    }, 5000);
  });
}
