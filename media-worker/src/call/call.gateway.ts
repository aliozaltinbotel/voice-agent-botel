import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'calls',
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CallGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @OnEvent('call.started')
  handleCallStarted(data: any) {
    this.server.emit('callStarted', data);
  }

  @OnEvent('call.ended')
  handleCallEnded(data: any) {
    this.server.emit('callEnded', data);
  }

  @OnEvent('call.failed')
  handleCallFailed(data: any) {
    this.server.emit('callFailed', data);
  }

  @OnEvent('voice-live.transcript')
  handleTranscript(data: any) {
    this.server.emit('transcript', data);
  }

  @OnEvent('demo.scheduled')
  handleDemoScheduled(data: any) {
    this.server.emit('demoScheduled', data);
  }
} 