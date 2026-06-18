import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { PaginatedResponse, TicketDTO } from "@pulsedesk/shared";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { ListTicketsQueryDto } from "./dto/list-tickets-query.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { TicketsService, type TicketDetailDTO } from "./tickets.service";

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

  @Get(":id")
  @UseGuards(ClerkAuthGuard)
  getTicket(@Param("id") id: string): Promise<TicketDetailDTO> {
    return this.ticketsService.getTicket(id);
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
