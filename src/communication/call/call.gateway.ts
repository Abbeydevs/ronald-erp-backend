import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CallGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`WebRTC Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WebRTC Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-call-room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; role: 'COUNSELLOR' | 'STUDENT' },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(data.roomId);
    this.logger.log(`${data.role} joined call room: ${data.roomId}`);

    if (data.role === 'STUDENT') {
      client.to(data.roomId).emit('student-ready');
    }
  }

  @SubscribeMessage('webrtc-offer')
  handleOffer(
    @MessageBody() data: { roomId: string; signal: Record<string, unknown> },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.roomId).emit('webrtc-offer', { signal: data.signal });
  }

  @SubscribeMessage('webrtc-answer')
  handleAnswer(
    @MessageBody() data: { roomId: string; signal: Record<string, unknown> },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.roomId).emit('webrtc-answer', { signal: data.signal });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @MessageBody() data: { roomId: string; candidate: Record<string, unknown> },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.roomId).emit('ice-candidate', { candidate: data.candidate });
  }

  @SubscribeMessage('end-call')
  handleEndCall(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // ADD THIS LOG:
    console.log(`RECEIVED HANGUP FOR ROOM: ${data.roomId}`);

    client.to(data.roomId).emit('call-ended');
  }
}
