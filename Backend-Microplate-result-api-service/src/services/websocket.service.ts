import { WebSocketService, WebSocketMessage, WebSocketNotification } from '@/types/result.types';
import { logger } from '@/utils/logger';

export class WebSocketServiceImpl implements WebSocketService {
  private connections = new Map<string, Set<WebSocket>>();
  private sampleSubscriptions = new Map<string, Set<string>>();
  private runSubscriptions = new Map<number, Set<string>>();
  private systemSubscriptions = new Set<string>();

  constructor() {
    
    setInterval(() => {
      this.cleanupDeadConnections();
    }, 30000); 
  }

  addConnection(connectionId: string, ws: WebSocket): void {
    if (!this.connections.has(connectionId)) {
      this.connections.set(connectionId, new Set());
    }
    this.connections.get(connectionId)!.add(ws);

    
    ws.addEventListener('close', () => {
      this.removeConnection(connectionId, ws);
    });

    ws.addEventListener('error', (error) => {
      logger.error('WebSocket error', { connectionId, error });
      this.removeConnection(connectionId, ws);
    });

    
    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data.toString()) as WebSocketMessage;
        this.handleMessage(connectionId, message);
      } catch (error) {
        logger.error('Invalid WebSocket message', { connectionId, error });
      }
    });

    logger.info('WebSocket connection added', { connectionId });
  }

  removeConnection(connectionId: string, ws: WebSocket): void {
    const connections = this.connections.get(connectionId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.connections.delete(connectionId);
        this.removeAllSubscriptions(connectionId);
      }
    }

    logger.info('WebSocket connection removed', { connectionId });
  }

  subscribeToSample(connectionId: string, sampleNo: string): void {
    if (!this.sampleSubscriptions.has(sampleNo)) {
      this.sampleSubscriptions.set(sampleNo, new Set());
    }
    this.sampleSubscriptions.get(sampleNo)!.add(connectionId);

    logger.info('Subscribed to sample updates', { connectionId, sampleNo });
  }

  unsubscribeFromSample(connectionId: string, sampleNo: string): void {
    const subscribers = this.sampleSubscriptions.get(sampleNo);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.sampleSubscriptions.delete(sampleNo);
      }
    }

    logger.info('Unsubscribed from sample updates', { connectionId, sampleNo });
  }

  subscribeToRun(connectionId: string, runId: number): void {
    if (!this.runSubscriptions.has(runId)) {
      this.runSubscriptions.set(runId, new Set());
    }
    this.runSubscriptions.get(runId)!.add(connectionId);

    logger.info('Subscribed to run updates', { connectionId, runId });
  }

  unsubscribeFromRun(connectionId: string, runId: number): void {
    const subscribers = this.runSubscriptions.get(runId);
    if (subscribers) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.runSubscriptions.delete(runId);
      }
    }

    logger.info('Unsubscribed from run updates', { connectionId, runId });
  }

  subscribeToSystem(connectionId: string): void {
    this.systemSubscriptions.add(connectionId);
    logger.info('Subscribed to system updates', { connectionId });
  }

  unsubscribeFromSystem(connectionId: string): void {
    this.systemSubscriptions.delete(connectionId);
    logger.info('Unsubscribed from system updates', { connectionId });
  }

  async broadcastSampleUpdate(sampleNo: string, data: any): Promise<void> {
    const subscribers = this.sampleSubscriptions.get(sampleNo);
    if (!subscribers || subscribers.size === 0) return;

    const notification: WebSocketNotification = {
      type: 'sample_updated',
      data: {
        sampleNo,
        ...data,
      },
      timestamp: new Date(),
    };

    await this.broadcastToConnections(subscribers, notification);
    logger.info('Sample update broadcasted', { sampleNo, subscriberCount: subscribers.size });
  }

  async broadcastRunUpdate(runId: number, data: any): Promise<void> {
    const subscribers = this.runSubscriptions.get(runId);
    if (!subscribers || subscribers.size === 0) return;

    const notification: WebSocketNotification = {
      type: 'run_completed',
      data: {
        runId,
        ...data,
      },
      timestamp: new Date(),
    };

    await this.broadcastToConnections(subscribers, notification);
    logger.info('Run update broadcasted', { runId, subscriberCount: subscribers.size });
  }

  async broadcastSystemUpdate(data: any): Promise<void> {
    if (this.systemSubscriptions.size === 0) return;

    const notification: WebSocketNotification = {
      type: 'system_stats_updated',
      data,
      timestamp: new Date(),
    };

    await this.broadcastToConnections(this.systemSubscriptions, notification);
    logger.info('System update broadcasted', { subscriberCount: this.systemSubscriptions.size });
  }

  private async broadcastToConnections(
    connectionIds: Set<string> | IterableIterator<string>, 
    notification: WebSocketNotification
  ): Promise<void> {
    const message = JSON.stringify(notification);
    const deadConnections: string[] = [];

    for (const connectionId of connectionIds) {
      const connections = this.connections.get(connectionId);
      if (connections) {
        for (const ws of connections) {
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(message);
            } else {
              deadConnections.push(connectionId);
            }
          } catch (error) {
            logger.error('Error sending WebSocket message', { connectionId, error });
            deadConnections.push(connectionId);
          }
        }
      } else {
        deadConnections.push(connectionId);
      }
    }

    
    if (deadConnections.length > 0) {
      for (const connectionId of deadConnections) {
        this.removeConnection(connectionId, {} as WebSocket);
      }
    }
  }

  private handleMessage(connectionId: string, message: WebSocketMessage): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(connectionId, message.data);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(connectionId, message.data);
        break;
      case 'ping':
        this.handlePing(connectionId);
        break;
      default:
        logger.warn('Unknown WebSocket message type', { connectionId, type: message.type });
    }
  }

  private handleSubscription(connectionId: string, data: any): void {
    const { channel, sampleNo, runId } = data;

    switch (channel) {
      case 'sample':
        if (sampleNo) {
          this.subscribeToSample(connectionId, sampleNo);
        }
        break;
      case 'run':
        if (runId) {
          this.subscribeToRun(connectionId, runId);
        }
        break;
      case 'system':
        this.subscribeToSystem(connectionId);
        break;
      default:
        logger.warn('Unknown subscription channel', { connectionId, channel });
    }
  }

  private handleUnsubscription(connectionId: string, data: any): void {
    const { channel, sampleNo, runId } = data;

    switch (channel) {
      case 'sample':
        if (sampleNo) {
          this.unsubscribeFromSample(connectionId, sampleNo);
        }
        break;
      case 'run':
        if (runId) {
          this.unsubscribeFromRun(connectionId, runId);
        }
        break;
      case 'system':
        this.unsubscribeFromSystem(connectionId);
        break;
      default:
        logger.warn('Unknown unsubscription channel', { connectionId, channel });
    }
  }

  private handlePing(connectionId: string): void {
    const connections = this.connections.get(connectionId);
    if (connections) {
      for (const ws of connections) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      }
    }
  }

  private removeAllSubscriptions(connectionId: string): void {
    
    for (const [sampleNo, subscribers] of this.sampleSubscriptions.entries()) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.sampleSubscriptions.delete(sampleNo);
      }
    }

    
    for (const [runId, subscribers] of this.runSubscriptions.entries()) {
      subscribers.delete(connectionId);
      if (subscribers.size === 0) {
        this.runSubscriptions.delete(runId);
      }
    }

    
    this.systemSubscriptions.delete(connectionId);
  }

  private cleanupDeadConnections(): void {
    const deadConnections: string[] = [];

    for (const [connectionId, connections] of this.connections.entries()) {
      const aliveConnections = new Set<WebSocket>();
      
      for (const ws of connections) {
        if (ws.readyState === WebSocket.OPEN) {
          aliveConnections.add(ws);
        }
      }

      if (aliveConnections.size === 0) {
        deadConnections.push(connectionId);
      } else {
        this.connections.set(connectionId, aliveConnections);
      }
    }

    
    for (const connectionId of deadConnections) {
      this.connections.delete(connectionId);
      this.removeAllSubscriptions(connectionId);
    }

    if (deadConnections.length > 0) {
      logger.info('Cleaned up dead WebSocket connections', { count: deadConnections.length });
    }
  }

  
  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      totalWebSockets: Array.from(this.connections.values()).reduce(
        (sum, connections) => sum + connections.size, 0
      ),
      sampleSubscriptions: this.sampleSubscriptions.size,
      runSubscriptions: this.runSubscriptions.size,
      systemSubscriptions: this.systemSubscriptions.size,
    };
  }

  
  isHealthy(): boolean {
    return true; 
  }
}
