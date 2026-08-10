import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PresenceService } from './presence.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(PresenceGateway.name);

  private activeClients = new Map<
    string,
    { userId: string; lastSeen: number }
  >();

  private readonly IDLE_THRESHOLD_MS = 60 * 60 * 1000;

  constructor(private readonly presenceService: PresenceService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.activeClients.set(client.id, { userId, lastSeen: Date.now() });
      this.logger.log(`Socket connected for User ID: ${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.activeClients.delete(client.id);
  }

  @SubscribeMessage('heartbeat')
  handleHeartbeat(@ConnectedSocket() client: Socket) {
    const session = this.activeClients.get(client.id);
    if (session) {
      session.lastSeen = Date.now();
      this.activeClients.set(client.id, session);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkIdleSessions() {
    const now = Date.now();

    for (const [socketId, session] of this.activeClients.entries()) {
      const idleTime = now - session.lastSeen;

      if (idleTime > this.IDLE_THRESHOLD_MS) {
        this.server.to(socketId).emit('SESSION_LOCKED', {
          message: 'Inactivity threshold exceeded. Session locked.',
        });

        await this.presenceService.handleIdleThresholdBreach(session.userId);

        this.activeClients.delete(socketId);
      }
    }
  }
}
