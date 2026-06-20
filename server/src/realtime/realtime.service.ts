import { Injectable } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";

@Injectable()
export class RealtimeService {
  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  emitTicketUpdated(ticketId: string, payload: unknown): void {
    this.realtimeGateway.emitTicketUpdated(ticketId, payload);
  }

  emitAiSuggestionReady(ticketId: string): void {
    this.realtimeGateway.emitAiSuggestionReady(ticketId);
  }
}
