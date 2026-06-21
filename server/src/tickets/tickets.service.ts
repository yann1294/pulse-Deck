import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import {
  AiSuggestionStatus,
  Prisma,
  TicketCategory,
  TicketMessageAuthorType,
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
import { AiService } from "../ai/ai.service";
import { buildClassifyTicketPrompt } from "../ai/prompts/classify-ticket.prompt";
import { buildPrioritizeTicketPrompt } from "../ai/prompts/prioritize-ticket.prompt";
import { buildSuggestReplyPrompt } from "../ai/prompts/suggest-reply.prompt";
import { KnowledgeBaseService, type KnowledgeSearchResultDTO } from "../knowledge-base/knowledge-base.service";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../queue/queue.service";
import { RealtimeService } from "../realtime/realtime.service";
import type { CreateInternalNoteDto } from "./dto/create-internal-note.dto";
import type { CreateTicketDto } from "./dto/create-ticket.dto";
import type { CreateTicketMessageDto, TicketMessageAuthorTypeParam } from "./dto/create-ticket-message.dto";
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

type TicketWithLatestSuggestion = Prisma.TicketGetPayload<{
  include: {
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
          where: { id: { not: string } };
          orderBy: { createdAt: "desc" };
          take: 5;
          include: {
            aiSuggestions: {
              orderBy: { createdAt: "desc" };
              take: 1;
            };
          };
        };
      };
    };
    aiSuggestions: {
      orderBy: { createdAt: "desc" };
    };
  };
}>;

export interface AdminTicketDetailDTO {
  ticket: TicketDTO;
  customer: CustomerDTO;
  customerHistory: TicketDTO[];
  aiSuggestions: AiSuggestionDTO[];
}

export interface GenerateAiSuggestionResultDTO {
  ticket: TicketDTO;
  suggestion: AiSuggestionDTO & {
    summary?: string;
    retrievedContext?: Prisma.JsonValue;
  };
}

export type TicketMessageAuthorTypeDTO = "customer" | "admin" | "ai" | "system";

export interface TicketMessageDTO {
  id: string;
  ticketId: string;
  authorType: TicketMessageAuthorTypeDTO;
  authorName?: string;
  authorEmail?: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TicketWithCustomerForAi {
  id: string;
  subject: string;
  description: string;
  customer: {
    name: string;
    email: string;
    companyName: string | null;
    _count?: {
      tickets: number;
    };
  };
}

interface ClassificationOutput {
  category: TicketCategory;
  confidence: number;
  reasoning: string;
}

interface PriorityOutput {
  priority: TicketPriority;
  confidence: number;
  reasoning: string;
  escalationSignals: string[];
}

interface SuggestedReplyOutput {
  summary: string;
  replyDraft: string;
  contextSufficient: boolean;
  insufficientContextReason: string | null;
  citations: Array<{
    id: string;
    title: string;
    sourceName: string;
  }>;
  confidence: number;
  humanReviewRequired: true;
  internalNotes: string;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly queueService: QueueService,
    private readonly realtimeService: RealtimeService
  ) {}

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

    try {
      const jobs = await this.queueService.enqueueTicketAi(ticket.id);
      this.logger.log(
        `Enqueued ${jobs.length} ticket-ai jobs for ticket ${ticket.id}: ${jobs
          .map((job) => job.name)
          .join(", ")}`
      );
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to enqueue ticket-ai jobs for ticket ${ticket.id}; ticket creation will continue. Reason: ${getFailureMessage(error)}`
      );
    }

    return {
      ...this.toTicketDto(ticket),
      aiStatus: "PENDING"
    };
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

  async getTicketById(id: string): Promise<AdminTicketDetailDTO> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            _count: {
              select: { tickets: true }
            },
            tickets: {
              where: {
                id: {
                  not: id
                }
              },
              orderBy: { createdAt: "desc" },
              take: 5,
              include: {
                aiSuggestions: {
                  orderBy: { createdAt: "desc" },
                  take: 1
                }
              }
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

  async listTicketMessages(ticketId: string): Promise<TicketMessageDTO[]> {
    await this.ensureTicketExists(ticketId);

    const messages = await this.prisma.ticketMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" }
    });

    return messages.map((message) => this.toTicketMessageDto(message));
  }

  async createTicketMessage(
    ticketId: string,
    createTicketMessageDto: CreateTicketMessageDto
  ): Promise<TicketMessageDTO> {
    await this.ensureTicketExists(ticketId);

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        authorType: toPrismaMessageAuthorType(createTicketMessageDto.authorType ?? "ADMIN"),
        ...(createTicketMessageDto.authorName ? { authorName: createTicketMessageDto.authorName } : {}),
        ...(createTicketMessageDto.authorEmail ? { authorEmail: createTicketMessageDto.authorEmail } : {}),
        body: createTicketMessageDto.body,
        isInternal: false
      }
    });

    return this.toTicketMessageDto(message);
  }

  async createInternalNote(
    ticketId: string,
    createInternalNoteDto: CreateInternalNoteDto
  ): Promise<TicketMessageDTO> {
    await this.ensureTicketExists(ticketId);

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        authorType: TicketMessageAuthorType.ADMIN,
        body: createInternalNoteDto.body,
        isInternal: true
      }
    });

    return this.toTicketMessageDto(message);
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

      const ticketDto = this.toTicketDto(ticket);
      this.realtimeService.emitTicketUpdated(ticket.id, ticketDto);

      return ticketDto;
    } catch (error: unknown) {
      if (isPrismaNotFoundError(error)) {
        throw new NotFoundException("Ticket not found");
      }

      throw error;
    }
  }

  async generateAiSuggestion(id: string): Promise<GenerateAiSuggestionResultDTO> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            _count: {
              select: { tickets: true }
            }
          }
        }
      }
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    let retrievedContext: KnowledgeSearchResultDTO[] = [];

    try {
      retrievedContext = await this.knowledgeBaseService.searchRelevantChunks(
        `${ticket.subject}\n\n${ticket.description}`,
        5
      );

      const classification = await this.classifyTicket(ticket);
      const priority = await this.prioritizeTicket(ticket, classification.category);
      const reply = await this.suggestReply(ticket, classification.category, priority.priority, retrievedContext);
      const suggestion = await this.prisma.ticketAiSuggestion.create({
        data: {
          ticketId: ticket.id,
          status: AiSuggestionStatus.GENERATED,
          suggestedReply: reply.replyDraft,
          suggestedCategory: classification.category,
          suggestedPriority: priority.priority,
          confidenceScore: averageConfidence([
            classification.confidence,
            priority.confidence,
            reply.confidence
          ]),
          ragSnippets: toJsonValue(retrievedContext),
          retrievedContext: toJsonValue({
            snippets: retrievedContext,
            classification: {
              category: classification.category,
              confidence: classification.confidence,
              reasoning: classification.reasoning
            },
            prioritization: {
              priority: priority.priority,
              confidence: priority.confidence,
              reasoning: priority.reasoning,
              escalationSignals: priority.escalationSignals
            },
            reply: {
              summary: reply.summary,
              contextSufficient: reply.contextSufficient,
              insufficientContextReason: reply.insufficientContextReason,
              citations: reply.citations,
              internalNotes: reply.internalNotes,
              humanReviewRequired: reply.humanReviewRequired
            }
          })
        }
      });
      const updatedTicket = await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          category: classification.category,
          priority: priority.priority
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

      const ticketDto = this.toTicketDto(updatedTicket);
      const suggestionDto = {
        ...this.toAiSuggestionDto(suggestion),
        summary: reply.summary,
        retrievedContext: suggestion.retrievedContext
      };

      this.realtimeService.emitTicketUpdated(ticket.id, ticketDto);
      this.realtimeService.emitAiSuggestionReady(ticket.id);

      return {
        ticket: ticketDto,
        suggestion: suggestionDto
      };
    } catch (error: unknown) {
      const failureMessage = getFailureMessage(error);
      await this.prisma.ticketAiSuggestion.create({
        data: {
          ticketId: ticket.id,
          status: AiSuggestionStatus.FAILED,
          errorMessage: failureMessage,
          retrievedContext: toJsonValue({
            snippets: retrievedContext,
            failure: failureMessage
          })
        }
      });

      throw new ServiceUnavailableException(
        `AI suggestion generation failed. A failed suggestion record was saved. Reason: ${failureMessage}`
      );
    }
  }

  private async classifyTicket(ticket: TicketWithCustomerForAi): Promise<ClassificationOutput> {
    const output = await this.aiService.generateJson(
      buildClassifyTicketPrompt({
        subject: ticket.subject,
        description: ticket.description,
        customerName: ticket.customer.name,
        ...(ticket.customer.companyName ? { companyName: ticket.customer.companyName } : {})
      })
    );

    return parseClassificationOutput(output);
  }

  private async prioritizeTicket(
    ticket: TicketWithCustomerForAi,
    category: TicketCategory
  ): Promise<PriorityOutput> {
    const output = await this.aiService.generateJson(
      buildPrioritizeTicketPrompt({
        subject: ticket.subject,
        description: ticket.description,
        category,
        customerName: ticket.customer.name,
        ...(ticket.customer.companyName ? { companyName: ticket.customer.companyName } : {}),
        customerTicketCount: ticket.customer._count?.tickets ?? 0
      })
    );

    return parsePriorityOutput(output);
  }

  private async suggestReply(
    ticket: TicketWithCustomerForAi,
    category: TicketCategory,
    priority: TicketPriority,
    snippets: KnowledgeSearchResultDTO[]
  ): Promise<SuggestedReplyOutput> {
    const output = await this.aiService.generateJson(
      buildSuggestReplyPrompt({
        ticket: {
          subject: ticket.subject,
          description: ticket.description,
          category,
          priority,
          customerName: ticket.customer.name,
          ...(ticket.customer.companyName ? { companyName: ticket.customer.companyName } : {})
        },
        snippets
      })
    );

    return parseSuggestedReplyOutput(output);
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

  private async ensureTicketExists(ticketId: string): Promise<void> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true }
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }
  }

  private toTicketDetailDto(ticket: TicketWithDetailRelations): AdminTicketDetailDTO {
    const customer = this.toCustomerDto(ticket.customer);

    return {
      ticket: this.toTicketDto(ticket),
      customer,
      customerHistory: ticket.customer.tickets.map((historyTicket) => this.toTicketDto(historyTicket)),
      aiSuggestions: ticket.aiSuggestions.map((suggestion) => this.toAiSuggestionDto(suggestion))
    };
  }

  private toTicketDto(
    ticket:
      | TicketWithCustomerAndLatestSuggestion
      | TicketWithLatestSuggestion
      | Prisma.TicketGetPayload<{}>
  ): TicketDTO {
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
	    const retrievedContext = suggestion.retrievedContext ?? undefined;
	    const summary = getSuggestionSummary(retrievedContext);

	    return {
	      id: suggestion.id,
	      ticketId: suggestion.ticketId,
	      status: toApiAiSuggestionStatus(suggestion.status),
	      ...(summary ? { summary } : {}),
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
	      ...(suggestion.ragSnippets ? { ragSnippets: suggestion.ragSnippets } : {}),
	      ...(retrievedContext ? { retrievedContext } : {}),
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

  private toTicketMessageDto(message: Prisma.TicketMessageGetPayload<{}>): TicketMessageDTO {
    return {
      id: message.id,
      ticketId: message.ticketId,
      authorType: toApiMessageAuthorType(message.authorType),
      ...(message.authorName ? { authorName: message.authorName } : {}),
      ...(message.authorEmail ? { authorEmail: message.authorEmail } : {}),
      body: message.body,
      isInternal: message.isInternal,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString()
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

function toPrismaMessageAuthorType(authorType: TicketMessageAuthorTypeParam): TicketMessageAuthorType {
  const authorTypeMap: Record<TicketMessageAuthorTypeParam, TicketMessageAuthorType> = {
    ADMIN: TicketMessageAuthorType.ADMIN,
    CUSTOMER: TicketMessageAuthorType.CUSTOMER
  };

  return authorTypeMap[authorType];
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

function toApiMessageAuthorType(authorType: TicketMessageAuthorType): TicketMessageAuthorTypeDTO {
  const authorTypeMap: Record<TicketMessageAuthorType, TicketMessageAuthorTypeDTO> = {
    CUSTOMER: "customer",
    ADMIN: "admin",
    AI: "ai",
    SYSTEM: "system"
  };

  return authorTypeMap[authorType];
}

function isPrismaNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

function parseClassificationOutput(output: unknown): ClassificationOutput {
  const record = asRecord(output, "classification output");
  const category = parseTicketCategory(record.category);

  return {
    category,
    confidence: parseConfidence(record.confidence, "classification confidence"),
    reasoning: parseString(record.reasoning, "classification reasoning")
  };
}

function parsePriorityOutput(output: unknown): PriorityOutput {
  const record = asRecord(output, "priority output");
  const escalationSignals = Array.isArray(record.escalationSignals)
    ? record.escalationSignals.map((signal) => parseString(signal, "escalation signal"))
    : [];

  return {
    priority: parseTicketPriority(record.priority),
    confidence: parseConfidence(record.confidence, "priority confidence"),
    reasoning: parseString(record.reasoning, "priority reasoning"),
    escalationSignals
  };
}

function parseSuggestedReplyOutput(output: unknown): SuggestedReplyOutput {
  const record = asRecord(output, "suggested reply output");
  const contextSufficient = parseBoolean(record.contextSufficient, "contextSufficient");
  const humanReviewRequired = parseBoolean(record.humanReviewRequired, "humanReviewRequired");

  if (!humanReviewRequired) {
    throw new ServiceUnavailableException("AI reply output must require human review");
  }

  return {
    summary: parseString(record.summary, "reply summary"),
    replyDraft: parseString(record.replyDraft, "reply draft"),
    contextSufficient,
    insufficientContextReason:
      typeof record.insufficientContextReason === "string"
        ? record.insufficientContextReason
        : null,
    citations: parseCitations(record.citations),
    confidence: parseConfidence(record.confidence, "reply confidence"),
    humanReviewRequired: true,
    internalNotes: parseString(record.internalNotes, "internal notes")
  };
}

function parseCitations(value: unknown): SuggestedReplyOutput["citations"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((citation) => {
    const record = asRecord(citation, "citation");

    return {
      id: parseString(record.id, "citation id"),
      title: parseString(record.title, "citation title"),
      sourceName: parseString(record.sourceName, "citation sourceName")
    };
  });
}

function parseTicketCategory(value: unknown): TicketCategory {
  if (typeof value !== "string" || !(value in TicketCategory)) {
    throw new ServiceUnavailableException(`AI returned unsupported category: ${String(value)}`);
  }

  return TicketCategory[value as keyof typeof TicketCategory];
}

function parseTicketPriority(value: unknown): TicketPriority {
  if (typeof value !== "string" || !(value in TicketPriority)) {
    throw new ServiceUnavailableException(`AI returned unsupported priority: ${String(value)}`);
  }

  return TicketPriority[value as keyof typeof TicketPriority];
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ServiceUnavailableException(`AI returned invalid ${label}`);
  }

  return value as Record<string, unknown>;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ServiceUnavailableException(`AI returned invalid ${label}`);
  }

  return value.trim();
}

function parseBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new ServiceUnavailableException(`AI returned invalid ${label}`);
  }

  return value;
}

function parseConfidence(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ServiceUnavailableException(`AI returned invalid ${label}`);
  }

  return Math.max(0, Math.min(1, value));
}

function averageConfidence(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getFailureMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown AI suggestion generation error";
}

function getSuggestionSummary(retrievedContext: Prisma.JsonValue | undefined): string | undefined {
  if (!retrievedContext || typeof retrievedContext !== "object" || Array.isArray(retrievedContext)) {
    return undefined;
  }

  const reply = (retrievedContext as Record<string, unknown>).reply;

  if (!reply || typeof reply !== "object" || Array.isArray(reply)) {
    return undefined;
  }

  const summary = (reply as Record<string, unknown>).summary;
  return typeof summary === "string" && summary.trim() ? summary.trim() : undefined;
}
