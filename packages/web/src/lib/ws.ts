/**
 * WebSocket client for real-time analysis progress updates.
 */

export type WsMessage =
  | { type: 'connected'; message: string }
  | { type: 'progress'; analysisId: string; repoPath: string; phase: string; message: string; progress: number }
  | { type: 'complete'; analysisId: string; repoPath: string; repoId: string; summary: any }
  | { type: 'error'; analysisId: string; repoPath: string; message: string };

type MessageHandler = (msg: WsMessage) => void;

let ws: WebSocket | null = null;
const handlers = new Set<MessageHandler>();

export function connectWebSocket(): WebSocket {
  if (ws && ws.readyState === WebSocket.OPEN) return ws;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(url);

  ws.onmessage = (event) => {
    try {
      const msg: WsMessage = JSON.parse(event.data);
      handlers.forEach((h) => h(msg));
    } catch {
      // Ignore malformed messages
    }
  };

  ws.onclose = () => {
    // Auto-reconnect after 3s
    setTimeout(() => connectWebSocket(), 3000);
  };

  return ws;
}

export function onMessage(handler: MessageHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function disconnectWebSocket(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
}
