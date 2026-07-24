/**
 * GitLens Server — Express API with WebSocket progress broadcasting.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root (two levels up from packages/server/src)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initWebSocket } from './ws.js';
import analyzeRoutes from './routes/analyze.js';
import { closeDb } from './db/schema.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app: express.Application = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', analyzeRoutes);

// WebSocket
initWebSocket(httpServer);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});

// Start
httpServer.listen(PORT, HOST, () => {
  console.log(`[Server] GitLens API running at http://${HOST}:${PORT}`);
  console.log(`[Server] WebSocket available at ws://${HOST}:${PORT}/ws`);
});

export default app;
