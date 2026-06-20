import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";
import type {
  AiSuggestionStatus as ApiAiSuggestionStatus,
  PaginatedResponse,
  TicketCategory as ApiTicketCategory,
  TicketPriority as ApiTicketPriority,
  TicketStatus as ApiTicketStatus
} from "@pulsedesk/shared";
import { PrismaService } from "../prisma/prisma.service";
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
        ...(ticket.aiSuggestions[0]
          ? { latestAiSuggestionStatus: toApiAiSuggestionStatus(ticket.aiSuggestions[0].status) }
          : {})
      }))
    };
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
