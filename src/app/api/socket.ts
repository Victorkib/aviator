import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import { GameWebSocketServer } from '@/lib/websocket-server';

let gameServer: GameWebSocketServer | null = null;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket.server.io) {
    console.log('Setting up Socket.IO server...');

    const httpServer: HTTPServer = res.socket.server as any;
    gameServer = new GameWebSocketServer(httpServer);
    res.socket.server.io = gameServer;
  }

  res.end();
}
