import { WebSocket } from 'ws';
import { logger } from '@/utils/logger';

export const websocketMessageHandlers = {
  handleMessage: (ws: WebSocket, data: any) => {
    try {
      logger.info('WebSocket message received', { data });
     
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', { error });
    }
  },
  handleDisconnect: (_ws: WebSocket) => {
    try {
      logger.info('WebSocket client disconnected');
    } catch (error) {
      logger.error('Error handling WebSocket disconnect', { error });
    }
  }
};
