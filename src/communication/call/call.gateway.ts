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
    @MessageBody() data: { roomId: string; signal: any },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.roomId).emit('webrtc-offer', data.signal);
  }

  @SubscribeMessage('webrtc-answer')
  handleAnswer(
    @MessageBody() data: { roomId: string; signal: any },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.roomId).emit('webrtc-answer', data.signal);
  }

  @SubscribeMessage('webrtc-ice-candidate')
  handleIceCandidate(
    @MessageBody() data: { roomId: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.roomId).emit('webrtc-ice-candidate', data.candidate);
  }
}
