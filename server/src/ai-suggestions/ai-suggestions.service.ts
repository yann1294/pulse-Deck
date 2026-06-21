import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiSuggestionStatus, Prisma, TicketCategory, TicketPriority } from "@prisma/client";
import type {
  AiSuggestionStatus as ApiAiSuggestionStatus,
  PaginatedResponse,
  TicketCategory as ApiTicketCategory,
  TicketPriority as ApiTicketPriority
} from "@pulsedesk/shared";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AiSuggestionStatusParam,
  ListAiSuggestionsQueryDto
} from "./dto/list-ai-suggestions-query.dto";

const DEFAULT_GENERATION_MODEL = "gemini-3.5-flash";

export interface AiSuggestionListItemDTO {
  id: string;
  ticketId: string;
  ticketTitle: string;
  customerName: string;
  customerEmail: string;
  summary?: string;
  confidence?: number;
  confidenceScore?: number;
  status: ApiAiSuggestionStatus;
  model: string;
  createdAt: string;
  priority: ApiTicketPriority;
  category: ApiTicketCategory;
  suggestedReply?: string;
}

type AiSuggestionWithTicket = Prisma.TicketAiSuggestionGetPayload<{
  include: {
    ticket: {
      include: {
        customer: true;
      };
    };
  };
}>;

@Injectable()
export class AiSuggestionsService {
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService
  ) {
    this.model = configService.get<string>("GEMINI_GENERATION_MODEL", DEFAULT_GENERATION_MODEL);
  }

  async listAiSuggestions(query: ListAiSuggestionsQueryDto): Promise<PaginatedResponse<AiSuggestionListItemDTO>> {
    const page = query.page;
    const pageSize = query.limit;
    const where = this.buildWhere(query);

    const [suggestions, totalItems] = await this.prisma.$transaction([
      this.prisma.ticketAiSuggestion.findMany({
        where,
        include: {
          ticket: {
            include: {
              customer: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.ticketAiSuggestion.count({ where })
    ]);

    return {
      data: suggestions.map((suggestion) => this.toAiSuggestionListItemDto(suggestion)),
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize)
    };
  }

  private buildWhere(query: ListAiSuggestionsQueryDto): Prisma.TicketAiSuggestionWhereInput {
    const where: Prisma.TicketAiSuggestionWhereInput = {};

    if (query.status) {
      where.status = toPrismaAiSuggestionStatus(query.status);
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { suggestedReply: { contains: search, mode: "insensitive" } },
        { errorMessage: { contains: search, mode: "insensitive" } },
        { ticket: { subject: { contains: search, mode: "insensitive" } } },
        { ticket: { customer: { name: { contains: search, mode: "insensitive" } } } },
        { ticket: { customer: { email: { contains: search, mode: "insensitive" } } } },
        { ticket: { customer: { companyName: { contains: search, mode: "insensitive" } } } }
      ];
    }

    return where;
  }

  private toAiSuggestionListItemDto(suggestion: AiSuggestionWithTicket): AiSuggestionListItemDTO {
    const summary = getSuggestionSummary(suggestion.retrievedContext);
    const confidence = suggestion.confidenceScore ?? undefined;

    return {
      id: suggestion.id,
      ticketId: suggestion.ticketId,
      ticketTitle: suggestion.ticket.subject,
      customerName: suggestion.ticket.customer.name,
      customerEmail: suggestion.ticket.customer.email,
      ...(summary ? { summary } : {}),
      ...(typeof confidence === "number" ? { confidence, confidenceScore: confidence } : {}),
      status: toApiAiSuggestionStatus(suggestion.status),
      model: this.model,
      createdAt: suggestion.createdAt.toISOString(),
      priority: toApiPriority(suggestion.suggestedPriority ?? suggestion.ticket.priority),
      category: toApiCategory(suggestion.suggestedCategory ?? suggestion.ticket.category),
      ...(suggestion.suggestedReply ? { suggestedReply: suggestion.suggestedReply } : {})
    };
  }
}

function toPrismaAiSuggestionStatus(status: AiSuggestionStatusParam): AiSuggestionStatus {
  const statusMap: Record<AiSuggestionStatusParam, AiSuggestionStatus> = {
    pending: AiSuggestionStatus.PENDING,
    generated: AiSuggestionStatus.GENERATED,
    approved: AiSuggestionStatus.APPROVED,
    edited: AiSuggestionStatus.EDITED,
    failed: AiSuggestionStatus.FAILED
  };

  return statusMap[status];
}

function toApiAiSuggestionStatus(status: AiSuggestionStatus): ApiAiSuggestionStatus {
  const statusMap: Record<AiSuggestionStatus, ApiAiSuggestionStatus> = {
    PENDING: "pending",
    GENERATED: "generated",
    APPROVED: "approved",
    EDITED: "edited",
    FAILED: "failed"
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

function getSuggestionSummary(retrievedContext: Prisma.JsonValue | null): string | undefined {
  if (!retrievedContext || typeof retrievedContext !== "object" || Array.isArray(retrievedContext)) {
    return undefined;
  }

  const reply = retrievedContext.reply;

  if (!reply || typeof reply !== "object" || Array.isArray(reply)) {
    return undefined;
  }

  const summary = reply.summary;

  return typeof summary === "string" && summary.trim() ? summary : undefined;
}
