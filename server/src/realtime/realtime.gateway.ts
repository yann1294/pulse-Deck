import { Logger } from "@nestjs/common";
import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import type { Server } from "socket.io";

export const TICKET_UPDATED_EVENT = "ticket.updated";
export const TICKET_AI_SUGGESTION_READY_EVENT = "ticket.aiSuggestionReady";

@WebSocketGateway()
export class RealtimeGateway implements OnGatewayInit {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  afterInit(): void {
    this.logger.log("Realtime gateway initialized");
  }

  emitTicketUpdated(ticketId: string, payload: unknown): void {
    this.server.emit(TICKET_UPDATED_EVENT, {
      ticketId,
      payload
    });
  }

  emitAiSuggestionReady(ticketId: string): void {
    this.server.emit(TICKET_AI_SUGGESTION_READY_EVENT, {
      ticketId
    });
  }
}
