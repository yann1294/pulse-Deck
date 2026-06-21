import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { PaginatedResponse, TicketDTO } from "@pulsedesk/shared";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import { CreateInternalNoteDto } from "./dto/create-internal-note.dto";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { CreateTicketMessageDto } from "./dto/create-ticket-message.dto";
import { ListTicketsQueryDto } from "./dto/list-tickets-query.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { TicketsService, type AdminTicketDetailDTO, type TicketMessageDTO } from "./tickets.service";

@Controller("tickets")
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  createTicket(@Body() createTicketDto: CreateTicketDto): Promise<TicketDTO> {
    return this.ticketsService.createTicket(createTicketDto);
  }

  @Get()
  @UseGuards(ClerkAuthGuard)
  listTickets(@Query() query: ListTicketsQueryDto): Promise<PaginatedResponse<TicketDTO>> {
    return this.ticketsService.listTickets(query);
  }

  @Get(":id/messages")
  @UseGuards(ClerkAuthGuard)
  listTicketMessages(@Param("id") id: string): Promise<TicketMessageDTO[]> {
    return this.ticketsService.listTicketMessages(id);
  }

  @Post(":id/messages")
  @UseGuards(ClerkAuthGuard)
  createTicketMessage(
    @Param("id") id: string,
    @Body() createTicketMessageDto: CreateTicketMessageDto
  ): Promise<TicketMessageDTO> {
    return this.ticketsService.createTicketMessage(id, createTicketMessageDto);
  }

  @Post(":id/internal-notes")
  @UseGuards(ClerkAuthGuard)
  createInternalNote(
    @Param("id") id: string,
    @Body() createInternalNoteDto: CreateInternalNoteDto
  ): Promise<TicketMessageDTO> {
    return this.ticketsService.createInternalNote(id, createInternalNoteDto);
  }

  @Get(":id")
  @UseGuards(ClerkAuthGuard)
  getTicket(@Param("id") id: string): Promise<AdminTicketDetailDTO> {
    return this.ticketsService.getTicketById(id);
  }

  @Post(":id/generate-ai-suggestion")
  @UseGuards(ClerkAuthGuard)
  generateAiSuggestion(@Param("id") id: string) {
    return this.ticketsService.generateAiSuggestion(id);
  }

  @Patch(":id/status")
  @UseGuards(ClerkAuthGuard)
  updateTicketStatus(
    @Param("id") id: string,
    @Body() updateTicketStatusDto: UpdateTicketStatusDto
  ): Promise<TicketDTO> {
    return this.ticketsService.updateTicketStatus(id, updateTicketStatusDto);
  }
}
