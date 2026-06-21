import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";
import type {
  AiSuggestionStatus as ApiAiSuggestionStatus,
  PaginatedResponse,
  TicketCategory as ApiTicketCategory,
  TicketPriority as ApiTicketPriority,
  TicketSlaDTO,
  TicketStatus as ApiTicketStatus
} from "@pulsedesk/shared";
import { PrismaService } from "../prisma/prisma.service";
import { calculateTicketSla } from "../sla/sla.util";
import type { ListCustomersQueryDto } from "./dto/list-customers-query.dto";

export interface CustomerListItemDTO {
  id: string;
  name: string;
  email: string;
  company?: string;
  companyName?: string;
  createdAt: string;
  ticketCount: number;
  openTicketCount: number;
  resolvedTicketCount?: number;
  latestTicketAt?: string;
}

export interface CustomerTicketHistoryItemDTO {
  id: string;
  title: string;
  status: ApiTicketStatus;
  priority: ApiTicketPriority;
  category: ApiTicketCategory;
  createdAt: string;
  sla: TicketSlaDTO;
  latestAiSuggestionStatus?: ApiAiSuggestionStatus;
}

export interface CustomerDetailDTO {
  customer: CustomerListItemDTO;
  metrics: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
  };
  recentTickets: CustomerTicketHistoryItemDTO[];
}

export type CustomerTimelineEventType =
  | "CUSTOMER_CREATED"
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "AI_SUGGESTION_GENERATED"
  | "AI_REPLY_APPROVED"
  | "MESSAGE_ADDED"
  | "INTERNAL_NOTE_ADDED"
  | "TICKET_RESOLVED";

export interface CustomerTimelineEventDTO {
  id: string;
  type: CustomerTimelineEventType;
  title: string;
  description: string;
  timestamp: string;
  ticketId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

type CustomerWithTicketCounts = Prisma.CustomerGetPayload<{
  include: {
    _count: {
      select: { tickets: true };
    };
    tickets: {
      select: {
        id: true;
        status: true;
        updatedAt: true;
      };
    };
  };
}>;

type CustomerWithRecentTickets = Prisma.CustomerGetPayload<{
  include: {
    _count: {
      select: { tickets: true };
    };
    tickets: {
      orderBy: { createdAt: "desc" };
      take: 10;
      include: {
        aiSuggestions: {
          orderBy: { createdAt: "desc" };
          take: 1;
        };
      };
    };
  };
}>;

type CustomerWithTimelineRelations = Prisma.CustomerGetPayload<{
  include: {
    tickets: {
      include: {
        aiSuggestions: true;
        messages: true;
      };
    };
  };
}>;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async listCustomers(query: ListCustomersQueryDto): Promise<PaginatedResponse<CustomerListItemDTO>> {
    const page = query.page;
    const pageSize = query.limit;
    const where = this.buildCustomerWhere(query);

    const [customers, totalItems] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: { tickets: true }
          },
          tickets: {
            select: {
              id: true,
              status: true,
              updatedAt: true
            },
            orderBy: { updatedAt: "desc" }
          }
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.customer.count({ where })
    ]);

    return {
      data: customers.map((customer) => this.toCustomerListItemDto(customer)),
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize)
    };
  }

  async getCustomerById(id: string): Promise<CustomerDetailDTO> {
    const [customer, openTickets, resolvedTickets] = await this.prisma.$transaction([
      this.prisma.customer.findUnique({
        where: { id },
        include: {
          _count: {
            select: { tickets: true }
          },
          tickets: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              aiSuggestions: {
                orderBy: { createdAt: "desc" },
                take: 1
              }
            }
          }
        }
      }),
      this.prisma.ticket.count({
        where: {
          customerId: id,
          status: { not: TicketStatus.RESOLVED }
        }
      }),
      this.prisma.ticket.count({
        where: {
          customerId: id,
          status: TicketStatus.RESOLVED
        },
      })
    ]);

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return {
      customer: {
        ...this.toCustomerListItemDto(customer),
        openTicketCount: openTickets,
        resolvedTicketCount: resolvedTickets
      },
      metrics: {
        totalTickets: customer._count.tickets,
        openTickets,
        resolvedTickets
      },
      recentTickets: customer.tickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.subject,
        status: toApiStatus(ticket.status),
        priority: toApiPriority(ticket.priority),
        category: toApiCategory(ticket.category),
        createdAt: ticket.createdAt.toISOString(),
        sla: calculateTicketSla({
          createdAt: ticket.createdAt,
          priority: ticket.priority
        }),
        ...(ticket.aiSuggestions[0]
          ? { latestAiSuggestionStatus: toApiAiSuggestionStatus(ticket.aiSuggestions[0].status) }
          : {})
      }))
    };
  }

  async getCustomerTimeline(id: string): Promise<CustomerTimelineEventDTO[]> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        tickets: {
          include: {
            aiSuggestions: true,
            messages: true
          }
        }
      }
    });

    if (!customer) {
      throw new NotFoundException("Customer not found");
    }

    return this.buildCustomerTimeline(customer);
  }

  private buildCustomerWhere(query: ListCustomersQueryDto): Prisma.CustomerWhereInput {
    if (!query.search?.trim()) {
      return {};
    }

    const search = query.search.trim();

    return {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } }
      ]
    };
  }

  private toCustomerListItemDto(customer: CustomerWithTicketCounts | CustomerWithRecentTickets): CustomerListItemDTO {
    const openTicketCount = customer.tickets.filter((ticket) => ticket.status !== TicketStatus.RESOLVED).length;
    const latestTicketAt = customer.tickets[0]?.updatedAt;

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      ...(customer.companyName ? { company: customer.companyName, companyName: customer.companyName } : {}),
      createdAt: customer.createdAt.toISOString(),
      ticketCount: customer._count.tickets,
      openTicketCount,
      ...(latestTicketAt ? { latestTicketAt: latestTicketAt.toISOString() } : {})
    };
  }

  private buildCustomerTimeline(customer: CustomerWithTimelineRelations): CustomerTimelineEventDTO[] {
    const events: CustomerTimelineEventDTO[] = [
      {
        id: `customer-created-${customer.id}`,
        type: "CUSTOMER_CREATED",
        title: "Customer created",
        description: `${customer.name} was added to PulseDesk.`,
        timestamp: customer.createdAt.toISOString(),
        metadata: {
          customerId: customer.id,
          email: customer.email,
          companyName: customer.companyName
        }
      }
    ];

    for (const ticket of customer.tickets) {
      events.push({
        id: `ticket-created-${ticket.id}`,
        type: "TICKET_CREATED",
        title: "Ticket created",
        description: ticket.subject,
        timestamp: ticket.createdAt.toISOString(),
        ticketId: ticket.id,
        metadata: {
          status: toApiStatus(ticket.status),
          priority: toApiPriority(ticket.priority),
          category: toApiCategory(ticket.category)
        }
      });

      if (ticket.updatedAt.getTime() !== ticket.createdAt.getTime()) {
        events.push({
          id: `ticket-updated-${ticket.id}-${ticket.updatedAt.getTime()}`,
          type: "TICKET_UPDATED",
          title: "Ticket updated",
          description: ticket.subject,
          timestamp: ticket.updatedAt.toISOString(),
          ticketId: ticket.id,
          metadata: {
            status: toApiStatus(ticket.status),
            priority: toApiPriority(ticket.priority),
            category: toApiCategory(ticket.category)
          }
        });
      }

      if (ticket.status === TicketStatus.RESOLVED) {
        events.push({
          id: `ticket-resolved-${ticket.id}`,
          type: "TICKET_RESOLVED",
          title: "Ticket resolved",
          description: ticket.subject,
          timestamp: (ticket.resolvedAt ?? ticket.updatedAt).toISOString(),
          ticketId: ticket.id,
          metadata: {
            status: toApiStatus(ticket.status),
            priority: toApiPriority(ticket.priority)
          }
        });
      }

      for (const suggestion of ticket.aiSuggestions) {
        if (suggestion.suggestedReply || suggestion.originalSuggestedReply) {
          events.push({
            id: `ai-suggestion-generated-${suggestion.id}`,
            type: "AI_SUGGESTION_GENERATED",
            title: "AI suggestion generated",
            description: `AI generated a draft reply for "${ticket.subject}".`,
            timestamp: suggestion.createdAt.toISOString(),
            ticketId: ticket.id,
            metadata: {
              suggestionId: suggestion.id,
              status: toApiAiSuggestionStatus(suggestion.status),
              confidenceScore: suggestion.confidenceScore
            }
          });
        }

        if (suggestion.approvedAt && suggestion.finalApprovedReply) {
          events.push({
            id: `ai-reply-approved-${suggestion.id}`,
            type: "AI_REPLY_APPROVED",
            title: suggestion.editedBeforeApproval ? "Edited AI reply approved" : "AI draft approved",
            description: `A human-approved reply was added for "${ticket.subject}".`,
            timestamp: suggestion.approvedAt.toISOString(),
            ticketId: ticket.id,
            metadata: {
              suggestionId: suggestion.id,
              status: toApiAiSuggestionStatus(suggestion.status),
              editedBeforeApproval: suggestion.editedBeforeApproval,
              approvedByUserId: suggestion.approvedByUserId
            }
          });
        }
      }

      for (const message of ticket.messages) {
        events.push({
          id: `${message.isInternal ? "internal-note-added" : "message-added"}-${message.id}`,
          type: message.isInternal ? "INTERNAL_NOTE_ADDED" : "MESSAGE_ADDED",
          title: message.isInternal ? "Internal note added" : "Message added",
          description: getMessageTimelineDescription(message.body),
          timestamp: message.createdAt.toISOString(),
          ticketId: ticket.id,
          metadata: {
            messageId: message.id,
            authorType: toApiMessageAuthorType(message.authorType),
            authorName: message.authorName,
            isInternal: message.isInternal
          }
        });
      }
    }

    return events.sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp));
  }
}

function toApiStatus(status: TicketStatus): ApiTicketStatus {
  const statusMap: Record<TicketStatus, ApiTicketStatus> = {
    OPEN: "open",
    IN_PROGRESS: "in_progress",
    WAITING_CUSTOMER: "waiting_customer",
    RESOLVED: "resolved"
  };

  return statusMap[status];
}

function toApiPriority(priority: TicketPriority): ApiTicketPriority {
  const priorityMap: Record<TicketPriority, ApiTicketPriority> = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    URGENT: "urgent"
  };

  return priorityMap[priority];
}

function toApiCategory(category: TicketCategory): ApiTicketCategory {
  const categoryMap: Record<TicketCategory, ApiTicketCategory> = {
    BILLING: "billing",
    TECHNICAL: "technical",
    ACCOUNT: "account",
    BUG: "bug",
    FEATURE_REQUEST: "feature_request",
    OTHER: "other"
  };

  return categoryMap[category];
}

function toApiAiSuggestionStatus(status: Prisma.TicketAiSuggestionGetPayload<{}>["status"]): ApiAiSuggestionStatus {
  const statusMap: Record<Prisma.TicketAiSuggestionGetPayload<{}>["status"], ApiAiSuggestionStatus> = {
    PENDING: "pending",
    GENERATED: "generated",
    APPROVED: "approved",
    EDITED: "edited",
    FAILED: "failed"
  };

  return statusMap[status];
}

function toApiMessageAuthorType(authorType: Prisma.TicketMessageGetPayload<{}>["authorType"]): string {
  const authorTypeMap: Record<Prisma.TicketMessageGetPayload<{}>["authorType"], string> = {
    CUSTOMER: "customer",
    ADMIN: "admin",
    AI: "ai",
    SYSTEM: "system"
  };

  return authorTypeMap[authorType];
}

function getMessageTimelineDescription(body: string): string {
  const normalizedBody = body.trim().replace(/\s+/g, " ");

  if (normalizedBody.length <= 140) {
    return normalizedBody;
  }

  return `${normalizedBody.slice(0, 137)}...`;
}
