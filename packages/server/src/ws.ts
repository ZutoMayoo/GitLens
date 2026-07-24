/**
 * WebSocket server for real-time analysis progress broadcasting.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

let wss: WebSocketServer | null = null;

/**
 * Initialize the WebSocket server, attaching to an HTTP server.
 */
export function initWebSocket(httpServer: Server): WebSocketServer {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected');

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });

    // Send a welcome message
    ws.send(JSON.stringify({ type: 'connected', message: 'GitLens WebSocket ready' }));
  });

  console.log('[WS] WebSocket server initialized');
  return wss;
}

/**
 * Broadcast a message to all connected WebSocket clients.
 */
export function broadcast(data: Record<string, unknown>): void {
  if (!wss) return;

  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Broadcast to a specific analysis's subscribers.
 * (Currently broadcasts globally; can be filtered by analysisId in the future.)
 */
export function broadcastToAnalysis(
  analysisId: string,
  data: Record<string, unknown>
): void {
  broadcast({ analysisId, ...data });
}
