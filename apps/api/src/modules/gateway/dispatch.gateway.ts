import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class DispatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DispatchGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:nurse')
  handleJoinNurse(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { nurseId: string },
  ) {
    const room = `nurse:${data.nurseId}`;
    client.join(room);
    this.logger.log(`Socket ${client.id} joined ${room}`);
    return { status: 'joined', room };
  }

  @SubscribeMessage('join:booking')
  handleJoinBooking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string },
  ) {
    const room = `booking:${data.bookingId}`;
    client.join(room);
    this.logger.log(`Socket ${client.id} joined ${room}`);
    return { status: 'joined', room };
  }

  @SubscribeMessage('join:ops')
  handleJoinOps(@ConnectedSocket() client: Socket) {
    const room = 'ops';
    client.join(room);
    this.logger.log(`Socket ${client.id} joined ${room}`);
    return { status: 'joined', room };
  }

  // Real-time Event Broadcasters
  emitOfferCreated(nurseId: string, offer: any) {
    if (this.server) {
      this.server.to(`nurse:${nurseId}`).emit('dispatch.offer.created', offer);
      this.server.to('ops').emit('dispatch.offer.created', offer);
      this.logger.log(`Dispatched offer ${offer.offerId} to nurse:${nurseId}`);
    }
  }

  emitOfferClosed(nurseId: string, offerId: string, reason = 'CLOSED') {
    if (this.server) {
      this.server.to(`nurse:${nurseId}`).emit('dispatch.offer.closed', { offerId, reason });
      this.server.to('ops').emit('dispatch.offer.closed', { offerId, reason });
    }
  }

  emitBookingStatusChanged(bookingId: string, statusData: any) {
    if (this.server) {
      this.server.to(`booking:${bookingId}`).emit('booking.status.changed', statusData);
      this.server.to('ops').emit('booking.status.changed', statusData);
      this.logger.log(`Broadcasted booking.status.changed for ${bookingId}: ${statusData.status}`);
    }
  }

  emitIncidentReported(incident: any) {
    if (this.server) {
      this.server.to('ops').emit('incident.reported', incident);
    }
  }
}

