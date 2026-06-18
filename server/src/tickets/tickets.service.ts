import { Injectable, NotFoundException } from "@nestjs/common";
import {
  AiSuggestionStatus,
  Prisma,
  TicketCategory,
  TicketPriority,
  TicketStatus
} from "@prisma/client";
import type {
  AiSuggestionDTO,
  CustomerDTO,
  PaginatedResponse,
  TicketCategory as ApiTicketCategory,
  TicketDTO,
  TicketPriority as ApiTicketPriority,
  TicketStatus as ApiTicketStatus
} from "@pulsedesk/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateTicketDto } from "./dto/create-ticket.dto";
import type {
  ListTicketsQueryDto,
  TicketCategoryParam,
  TicketPriorityParam,
  TicketStatusParam
} from "./dto/list-tickets-query.dto";
import type { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";

type TicketWithCustomerAndLatestSuggestion = Prisma.TicketGetPayload<{
  include: {
    customer: {
      include: {
        _count: {
          select: { tickets: true };
        };
      };
    };
    aiSuggestions: {
      orderBy: { createdAt: "desc" };
      take: 1;
    };
  };
}>;

type TicketWithDetailRelations = Prisma.TicketGetPayload<{
  include: {
    customer: {
      include: {
        _count: {
          select: { tickets: true };
        };
        tickets: {
          orderBy: { createdAt: "desc" };
          take: 10;
        };
      };
    };
    aiSuggestions: {
      orderBy: { createdAt: "desc" };
    };
  };
}>;

export interface TicketDetailDTO extends TicketDTO {
  customer: CustomerDTO & {
    ticketHistory: TicketDTO[];
  };
  aiSuggestions: AiSuggestionDTO[];
}

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(createTicketDto: CreateTicketDto): Promise<TicketDTO> {
    const customer = await this.prisma.customer.upsert({
      where: { email: createTicketDto.customerEmail.toLowerCase() },
      create: {
        name: createTicketDto.customerName,
        email: createTicketDto.customerEmail.toLowerCase(),
        ...(createTicketDto.company ? { companyName: createTicketDto.company } : {})
      },
      update: {
        name: createTicketDto.customerName,
        ...(createTicketDto.company ? { companyName: createTicketDto.company } : {})
      }
    });

    const ticket = await this.prisma.ticket.create({
      data: {
        subject: createTicketDto.title,
        description: createTicketDto.description,
        ...(createTicketDto.attachmentUrl ? { attachmentUrl: createTicketDto.attachmentUrl } : {}),
        customerId: customer.id
      },
      include: {
        customer: {
          include: {
            _count: {
              select: { tickets: true }
            }
          }
        },
        aiSuggestions: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    return this.toTicketDto(ticket);
  }

  async listTickets(query: ListTicketsQueryDto): Promise<PaginatedResponse<TicketDTO>> {
    const page = query.page;
    const pageSize = query.limit;
    const where = this.buildTicketWhere(query);

    const [tickets, totalItems] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: {
          customer: {
            include: {
              _count: {
                select: { tickets: true }
              }
            }
          },
          aiSuggestions: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.ticket.count({ where })
    ]);

    return {
      data: tickets.map((ticket) => this.toTicketDto(ticket)),
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize)
    };
  }

  async getTicket(id: string): Promise<TicketDetailDTO> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            _count: {
              select: { tickets: true }
            },
            tickets: {
              orderBy: { createdAt: "desc" },
              take: 10
            }
          }
        },
        aiSuggestions: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    return this.toTicketDetailDto(ticket);
  }

  async updateTicketStatus(
    id: string,
    updateTicketStatusDto: UpdateTicketStatusDto
  ): Promise<TicketDTO> {
    try {
      const ticket = await this.prisma.ticket.update({
        where: { id },
        data: {
          status: toPrismaStatus(updateTicketStatusDto.status),
          resolvedAt:
            updateTicketStatusDto.status === "resolved"
              ? new Date()
              : null
        },
        include: {
          customer: {
            include: {
              _count: {
                select: { tickets: true }
              }
            }
          },
          aiSuggestions: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });

      return this.toTicketDto(ticket);
    } catch (error: unknown) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException("Ticket not found");
      }

      throw error;
    }
  }

  private buildTicketWhere(query: ListTicketsQueryDto): Prisma.TicketWhereInput {
    const where: Prisma.TicketWhereInput = {};

    if (query.status) {
      where.status = toPrismaStatus(query.status);
    }

    if (query.priority) {
      where.priority = toPrismaPriority(query.priority);
    }

    if (query.category) {
      where.category = toPrismaCategory(query.category);
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { customer: { companyName: { contains: search, mode: "insensitive" } } }
      ];
    }

    return where;
  }

  private toTicketDetailDto(ticket: TicketWithDetailRelations): TicketDetailDTO {
    const customer = this.toCustomerDto(ticket.customer);
    const ticketHistory = ticket.customer.tickets
      .filter((historyTicket) => historyTicket.id !== ticket.id)
      .map((historyTicket) => this.toTicketDto(historyTicket));

    return {
      ...this.toTicketDto(ticket),
      customer: {
        ...customer,
        ticketHistory
      },
      aiSuggestions: ticket.aiSuggestions.map((suggestion) => this.toAiSuggestionDto(suggestion))
    };
  }

  private toTicketDto(ticket: TicketWithCustomerAndLatestSuggestion | Prisma.TicketGetPayload<{}>): TicketDTO {
    const latestAiSuggestion =
      "aiSuggestions" in ticket && ticket.aiSuggestions[0]
        ? this.toAiSuggestionSummaryDto(ticket.aiSuggestions[0])
        : undefined;

    return {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      ...(ticket.attachmentUrl ? { attachmentUrl: ticket.attachmentUrl } : {}),
      status: toApiStatus(ticket.status),
      priority: toApiPriority(ticket.priority),
      category: toApiCategory(ticket.category),
      customerId: ticket.customerId,
      ...("customer" in ticket ? { customer: this.toCustomerDto(ticket.customer) } : {}),
      ...(latestAiSuggestion ? { latestAiSuggestion } : {}),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString()
    };
  }

  private toCustomerDto(customer: {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
    externalId: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: {
      tickets: number;
    };
  }): CustomerDTO {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      ...(customer.companyName ? { companyName: customer.companyName } : {}),
      ...(customer.externalId ? { externalId: customer.externalId } : {}),
      ticketCount: customer._count?.tickets ?? 0,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString()
    };
  }

  private toAiSuggestionDto(
    suggestion: Prisma.TicketAiSuggestionGetPayload<{}>
  ): AiSuggestionDTO {
    return {
      id: suggestion.id,
      ticketId: suggestion.ticketId,
      status: toApiAiSuggestionStatus(suggestion.status),
      ...(suggestion.suggestedReply ? { suggestedReply: suggestion.suggestedReply } : {}),
      ...(suggestion.suggestedCategory
        ? { suggestedCategory: toApiCategory(suggestion.suggestedCategory) }
        : {}),
      ...(suggestion.suggestedPriority
        ? { suggestedPriority: toApiPriority(suggestion.suggestedPriority) }
        : {}),
      ...(typeof suggestion.confidenceScore === "number"
        ? { confidenceScore: suggestion.confidenceScore }
        : {}),
      citations: [],
      ...(suggestion.errorMessage ? { errorMessage: suggestion.errorMessage } : {}),
      createdAt: suggestion.createdAt.toISOString(),
      updatedAt: suggestion.updatedAt.toISOString()
    };
  }

  private toAiSuggestionSummaryDto(suggestion: Prisma.TicketAiSuggestionGetPayload<{}>) {
    return {
      id: suggestion.id,
      status: toApiAiSuggestionStatus(suggestion.status),
      ...(suggestion.suggestedReply ? { suggestedReply: suggestion.suggestedReply } : {}),
      ...(typeof suggestion.confidenceScore === "number"
        ? { confidenceScore: suggestion.confidenceScore }
        : {}),
      createdAt: suggestion.createdAt.toISOString()
    };
  }
}

function toPrismaStatus(status: TicketStatusParam): TicketStatus {
  const statusMap: Record<TicketStatusParam, TicketStatus> = {
    open: TicketStatus.OPEN,
    in_progress: TicketStatus.IN_PROGRESS,
    waiting_customer: TicketStatus.WAITING_CUSTOMER,
    resolved: TicketStatus.RESOLVED
  };

  return statusMap[status];
}

function toPrismaPriority(priority: TicketPriorityParam): TicketPriority {
  const priorityMap: Record<TicketPriorityParam, TicketPriority> = {
    low: TicketPriority.LOW,
    medium: TicketPriority.MEDIUM,
    high: TicketPriority.HIGH,
    urgent: TicketPriority.URGENT
  };

  return priorityMap[priority];
}

function toPrismaCategory(category: TicketCategoryParam): TicketCategory {
  const categoryMap: Record<TicketCategoryParam, TicketCategory> = {
    billing: TicketCategory.BILLING,
    technical: TicketCategory.TECHNICAL,
    account: TicketCategory.ACCOUNT,
    bug: TicketCategory.BUG,
    feature_request: TicketCategory.FEATURE_REQUEST,
    other: TicketCategory.OTHER
  };

  return categoryMap[category];
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

function toApiAiSuggestionStatus(status: AiSuggestionStatus) {
  const statusMap: Record<AiSuggestionStatus, AiSuggestionDTO["status"]> = {
    PENDING: "pending",
    GENERATED: "generated",
    APPROVED: "approved",
    EDITED: "edited",
    FAILED: "failed"
  };

  return statusMap[status];
}

function isPrismaNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
