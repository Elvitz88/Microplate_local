import { Request, Response } from 'express';
import { WebSocketService } from '@/types/result.types';
import { logger } from '@/utils/logger';
import { createError } from '@/utils/errors';

export class WebSocketController {
  constructor(private websocketService: WebSocketService) {}

  async handleConnection(_request: Request, _response: Response) {
    try {
      
      
      throw new Error('WebSocket upgrade not supported in Express routes');
    } catch (error) {
      logger.error('Failed to establish WebSocket connection', { error });
      throw createError.websocket('Failed to establish WebSocket connection', { error });
    }
  }

  async handleAuthenticatedConnection(request: Request, _response: Response) {
    try {
      
      const user = (request as any).user;
      if (!user) {
        throw createError.unauthorized('Authentication required for WebSocket connection');
      }

      
      
      throw new Error('WebSocket upgrade not supported in Express routes');

    } catch (error) {
      logger.error('Failed to establish authenticated WebSocket connection', { error });
      throw createError.websocket('Failed to establish authenticated WebSocket connection', { error });
    }
  }

  
  async subscribeToSample(request: Request, response: Response) {
    try {
      const user = (request as any).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      const { sampleNo } = request.params as { sampleNo: string };
      const { connectionId } = request.body as { connectionId: string };

      this.websocketService.subscribeToSample(connectionId, sampleNo);

      logger.info('Sample subscription created via HTTP', { 
        connectionId,
        userId: user.id,
        sampleNo
      });

      return response.send({
        success: true,
        data: {
          message: 'Subscribed to sample updates',
          sampleNo,
          connectionId
        }
      });

    } catch (error) {
      logger.error('Failed to subscribe to sample via HTTP', { error });
      return response.status(400).send({
        success: false,
        error: {
          code: 'SUBSCRIPTION_FAILED',
          message: 'Failed to subscribe to sample updates',
        }
      });
    }
  }

  async unsubscribeFromSample(request: Request, response: Response) {
    try {
      const user = (request as any).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      const { sampleNo } = request.params as { sampleNo: string };
      const { connectionId } = request.body as { connectionId: string };

      this.websocketService.unsubscribeFromSample(connectionId, sampleNo);

      logger.info('Sample unsubscription created via HTTP', { 
        connectionId,
        userId: user.id,
        sampleNo
      });

      return response.send({
        success: true,
        data: {
          message: 'Unsubscribed from sample updates',
          sampleNo,
          connectionId
        }
      });

    } catch (error) {
      logger.error('Failed to unsubscribe from sample via HTTP', { error });
      return response.status(400).send({
        success: false,
        error: {
          code: 'UNSUBSCRIPTION_FAILED',
          message: 'Failed to unsubscribe from sample updates',
        }
      });
    }
  }

  async subscribeToRun(request: Request, response: Response) {
    try {
      const user = (request as any).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      const { runId } = request.params as any;
      const { connectionId } = request.body as { connectionId: string };

      this.websocketService.subscribeToRun(connectionId, runId);

      logger.info('Run subscription created via HTTP', { 
        connectionId,
        userId: user.id,
        runId
      });

      return response.send({
        success: true,
        data: {
          message: 'Subscribed to run updates',
          runId,
          connectionId
        }
      });

    } catch (error) {
      logger.error('Failed to subscribe to run via HTTP', { error });
      return response.status(400).send({
        success: false,
        error: {
          code: 'SUBSCRIPTION_FAILED',
          message: 'Failed to subscribe to run updates',
        }
      });
    }
  }

  async unsubscribeFromRun(request: Request, response: Response) {
    try {
      const user = (request as any).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      const { runId } = request.params as any;
      const { connectionId } = request.body as { connectionId: string };

      this.websocketService.unsubscribeFromRun(connectionId, runId);

      logger.info('Run unsubscription created via HTTP', { 
        connectionId,
        userId: user.id,
        runId
      });

      return response.send({
        success: true,
        data: {
          message: 'Unsubscribed from run updates',
          runId,
          connectionId
        }
      });

    } catch (error) {
      logger.error('Failed to unsubscribe from run via HTTP', { error });
      return response.status(400).send({
        success: false,
        error: {
          code: 'UNSUBSCRIPTION_FAILED',
          message: 'Failed to unsubscribe from run updates',
        }
      });
    }
  }

  async subscribeToSystem(request: Request, response: Response) {
    try {
      const user = (request as any).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      
      if (!user.roles.includes('admin')) {
        throw createError.forbidden('Admin role required for system subscriptions');
      }

      const { connectionId } = request.body as { connectionId: string };

      (this.websocketService as any).subscribeToSystem(connectionId);

      logger.info('System subscription created via HTTP', { 
        connectionId,
        userId: user.id
      });

      return response.send({
        success: true,
        data: {
          message: 'Subscribed to system updates',
          connectionId
        }
      });

    } catch (error) {
      logger.error('Failed to subscribe to system via HTTP', { error });
      return response.status(400).send({
        success: false,
        error: {
          code: 'SUBSCRIPTION_FAILED',
          message: 'Failed to subscribe to system updates',
        }
      });
    }
  }

  async unsubscribeFromSystem(request: Request, response: Response) {
    try {
      const user = (request as any).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      const { connectionId } = request.body as { connectionId: string };

      (this.websocketService as any).unsubscribeFromSystem(connectionId);

      logger.info('System unsubscription created via HTTP', { 
        connectionId,
        userId: user.id
      });

      return response.send({
        success: true,
        data: {
          message: 'Unsubscribed from system updates',
          connectionId
        }
      });

    } catch (error) {
      logger.error('Failed to unsubscribe from system via HTTP', { error });
      return response.status(400).send({
        success: false,
        error: {
          code: 'UNSUBSCRIPTION_FAILED',
          message: 'Failed to unsubscribe from system updates',
        }
      });
    }
  }

  async getConnectionStats(request: Request, response: Response) {
    try {
      const user = (request as any).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      
      if (!user.roles.includes('admin')) {
        throw createError.forbidden('Admin role required to view connection stats');
      }

      const stats = (this.websocketService as any).getConnectionStats();

      logger.info('Connection stats retrieved', { 
        userId: user.id,
        stats
      });

      return response.send({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Failed to get connection stats', { error });
      return response.status(400).send({
        success: false,
        error: {
          code: 'STATS_FAILED',
          message: 'Failed to get connection statistics',
        }
      });
    }
  }

  
  private generateConnectionId(request: Request): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const ip = request.ip?.replace(/[.:]/g, '') || 'unknown';
    
    return `ws_${timestamp}_${random}_${ip}`;
  }

  private generateAuthenticatedConnectionId(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    return `ws_auth_${userId}_${timestamp}_${random}`;
  }

  
  async broadcastSampleUpdate(sampleNo: string, data: any): Promise<void> {
    try {
      await this.websocketService.broadcastSampleUpdate(sampleNo, data);
      logger.info('Sample update broadcasted', { sampleNo });
    } catch (error) {
      logger.error('Failed to broadcast sample update', { sampleNo, error });
    }
  }

  async broadcastRunUpdate(runId: number, data: any): Promise<void> {
    try {
      await this.websocketService.broadcastRunUpdate(runId, data);
      logger.info('Run update broadcasted', { runId });
    } catch (error) {
      logger.error('Failed to broadcast run update', { runId, error });
    }
  }

  async broadcastSystemUpdate(data: any): Promise<void> {
    try {
      await this.websocketService.broadcastSystemUpdate(data);
      logger.info('System update broadcasted');
    } catch (error) {
      logger.error('Failed to broadcast system update', { error });
    }
  }
}
