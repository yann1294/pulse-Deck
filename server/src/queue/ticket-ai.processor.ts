import { Logger } from "@nestjs/common";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import {
  AiSuggestionStatus,
  Prisma,
  TicketCategory,
  TicketPriority
} from "@prisma/client";
import type { Job } from "bullmq";
import type {
  AiSuggestionStatus as ApiAiSuggestionStatus,
  TicketCategory as ApiTicketCategory,
  TicketPriority as ApiTicketPriority
} from "@pulsedesk/shared";
import { AiService } from "../ai/ai.service";
import { buildClassifyTicketPrompt } from "../ai/prompts/classify-ticket.prompt";
import { buildPrioritizeTicketPrompt } from "../ai/prompts/prioritize-ticket.prompt";
import { buildSuggestReplyPrompt } from "../ai/prompts/suggest-reply.prompt";
import { KnowledgeBaseService, type KnowledgeSearchResultDTO } from "../knowledge-base/knowledge-base.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import { TICKET_AI_QUEUE_NAME, type TicketAiJobData, type TicketAiJobName } from "./queue.service";

type TicketAiJob = Job<TicketAiJobData, unknown, TicketAiJobName>;

type TicketForAi = Prisma.TicketGetPayload<{
  include: {
    customer: {
      include: {
        _count: {
          select: { tickets: true };
        };
      };
    };
  };
}>;

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

@Processor(TICKET_AI_QUEUE_NAME)
export class TicketAiProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketAiProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly realtimeService: RealtimeService
  ) {
    super();
  }

  async process(job: TicketAiJob): Promise<unknown> {
    this.logger.log(`Starting ticket-ai job ${job.name} for ticket ${job.data.ticketId}`);

    switch (job.name) {
      case "classify":
        return this.handleClassify(job);
      case "prioritize":
        return this.handlePrioritize(job);
      case "suggest-reply":
        return this.handleSuggestReply(job);
      default:
        this.logger.warn(`Ignoring unsupported ticket-ai job: ${String(job.name)}`);
        return { status: "ignored", jobName: job.name };
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job): void {
    this.logger.log(`Completed ticket-ai job ${job.name} (${job.id ?? "no-id"})`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error): void {
    this.logger.error(
      `BullMQ marked ticket-ai job ${job?.name ?? "unknown"} (${job?.id ?? "no-id"}) failed: ${error.message}`
    );
  }

  private async handleClassify(job: TicketAiJob): Promise<unknown> {
    const ticket = await this.loadTicket(job);

    if (!ticket) {
      return { status: "skipped", reason: "ticket_not_found" };
    }

    try {
      const classification = parseClassificationOutput(
        await this.aiService.generateJson(
          buildClassifyTicketPrompt({
            subject: ticket.subject,
            description: ticket.description,
            customerName: ticket.customer.name,
            ...(ticket.customer.companyName ? { companyName: ticket.customer.companyName } : {})
          })
        )
      );

      const updatedTicket = await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { category: classification.category }
      });
      const suggestion = await this.prisma.ticketAiSuggestion.create({
        data: {
          ticketId: ticket.id,
          status: AiSuggestionStatus.GENERATED,
          suggestedCategory: classification.category,
          confidenceScore: classification.confidence,
          retrievedContext: toJsonValue({
            jobName: job.name,
            classification
          })
        }
      });

      this.logger.log(
        `Classified ticket ${ticket.id} as ${classification.category} with confidence ${classification.confidence}`
      );
      this.realtimeService.emitTicketUpdated(ticket.id, {
        category: toApiCategory(updatedTicket.category),
        aiStatus: "GENERATED",
        latestAiSuggestion: {
          id: suggestion.id,
          status: toApiAiSuggestionStatus(suggestion.status),
          createdAt: suggestion.createdAt.toISOString()
        },
        updatedAt: updatedTicket.updatedAt.toISOString()
      });

      return { status: "generated", suggestionId: suggestion.id };
    } catch (error: unknown) {
      return this.storeFailedSuggestion(ticket.id, job.name, error);
    }
  }

  private async handlePrioritize(job: TicketAiJob): Promise<unknown> {
    const ticket = await this.loadTicket(job);

    if (!ticket) {
      return { status: "skipped", reason: "ticket_not_found" };
    }

    try {
      const priority = parsePriorityOutput(
        await this.aiService.generateJson(
          buildPrioritizeTicketPrompt({
            subject: ticket.subject,
            description: ticket.description,
            category: ticket.category,
            customerName: ticket.customer.name,
            ...(ticket.customer.companyName ? { companyName: ticket.customer.companyName } : {}),
            customerTicketCount: ticket.customer._count.tickets
          })
        )
      );

      const updatedTicket = await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { priority: priority.priority }
      });
      const suggestion = await this.prisma.ticketAiSuggestion.create({
        data: {
          ticketId: ticket.id,
          status: AiSuggestionStatus.GENERATED,
          suggestedPriority: priority.priority,
          confidenceScore: priority.confidence,
          retrievedContext: toJsonValue({
            jobName: job.name,
            prioritization: priority
          })
        }
      });

      this.logger.log(
        `Prioritized ticket ${ticket.id} as ${priority.priority} with confidence ${priority.confidence}`
      );
      this.realtimeService.emitTicketUpdated(ticket.id, {
        priority: toApiPriority(updatedTicket.priority),
        aiStatus: "GENERATED",
        latestAiSuggestion: {
          id: suggestion.id,
          status: toApiAiSuggestionStatus(suggestion.status),
          createdAt: suggestion.createdAt.toISOString()
        },
        updatedAt: updatedTicket.updatedAt.toISOString()
      });

      return { status: "generated", suggestionId: suggestion.id };
    } catch (error: unknown) {
      return this.storeFailedSuggestion(ticket.id, job.name, error);
    }
  }

  private async handleSuggestReply(job: TicketAiJob): Promise<unknown> {
    const ticket = await this.loadTicket(job);

    if (!ticket) {
      return { status: "skipped", reason: "ticket_not_found" };
    }

    let snippets: KnowledgeSearchResultDTO[] = [];

    try {
      snippets = await this.knowledgeBaseService.searchRelevantChunks(
        `${ticket.subject}\n\n${ticket.description}`,
        5
      );
      const reply = parseSuggestedReplyOutput(
        await this.aiService.generateJson(
          buildSuggestReplyPrompt({
            ticket: {
              subject: ticket.subject,
              description: ticket.description,
              category: ticket.category,
              priority: ticket.priority,
              customerName: ticket.customer.name,
              ...(ticket.customer.companyName ? { companyName: ticket.customer.companyName } : {})
            },
            snippets
          })
        )
      );
      const suggestion = await this.prisma.ticketAiSuggestion.create({
        data: {
          ticketId: ticket.id,
          status: AiSuggestionStatus.GENERATED,
          suggestedReply: reply.replyDraft,
          suggestedCategory: ticket.category,
          suggestedPriority: ticket.priority,
          confidenceScore: reply.confidence,
          ragSnippets: toJsonValue(snippets),
          retrievedContext: toJsonValue({
            jobName: job.name,
            snippets,
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

      this.logger.log(
        `Generated suggested reply for ticket ${ticket.id} with confidence ${reply.confidence}`
      );
      this.realtimeService.emitAiSuggestionReady(ticket.id);

      return { status: "generated", suggestionId: suggestion.id };
    } catch (error: unknown) {
      return this.storeFailedSuggestion(ticket.id, job.name, error, snippets);
    }
  }

  private async loadTicket(job: TicketAiJob): Promise<TicketForAi | null> {
    const ticketId = job.data.ticketId?.trim();

    if (!ticketId) {
      this.logger.warn(`Skipping ticket-ai job ${job.name}: missing ticketId`);
      return null;
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
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
      this.logger.warn(`Skipping ticket-ai job ${job.name}: ticket ${ticketId} was not found`);
    }

    return ticket;
  }

  private async storeFailedSuggestion(
    ticketId: string,
    jobName: TicketAiJobName,
    error: unknown,
    snippets: KnowledgeSearchResultDTO[] = []
  ): Promise<unknown> {
    const errorMessage = getErrorMessage(error);

    this.logger.warn(`Ticket AI job ${jobName} failed for ticket ${ticketId}: ${errorMessage}`);

    const suggestion = await this.prisma.ticketAiSuggestion.create({
      data: {
        ticketId,
        status: AiSuggestionStatus.FAILED,
        errorMessage,
        ragSnippets: snippets.length > 0 ? toJsonValue(snippets) : undefined,
        retrievedContext: toJsonValue({
          jobName,
          snippets,
          failure: errorMessage
        })
      }
    });
    this.realtimeService.emitTicketUpdated(ticketId, {
      aiStatus: "FAILED",
      latestAiSuggestion: {
        id: suggestion.id,
        status: toApiAiSuggestionStatus(suggestion.status),
        createdAt: suggestion.createdAt.toISOString()
      }
    });

    return {
      status: "failed",
      suggestionId: suggestion.id,
      errorMessage
    };
  }
}

function parseClassificationOutput(output: unknown): ClassificationOutput {
  const record = asRecord(output, "classification output");

  return {
    category: parseTicketCategory(record.category),
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
  const humanReviewRequired = parseBoolean(record.humanReviewRequired, "humanReviewRequired");

  if (!humanReviewRequired) {
    throw new Error("AI reply output must require human review");
  }

  return {
    summary: parseString(record.summary, "reply summary"),
    replyDraft: parseString(record.replyDraft, "reply draft"),
    contextSufficient: parseBoolean(record.contextSufficient, "contextSufficient"),
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
    throw new Error(`AI returned unsupported category: ${String(value)}`);
  }

  return TicketCategory[value as keyof typeof TicketCategory];
}

function parseTicketPriority(value: unknown): TicketPriority {
  if (typeof value !== "string" || !(value in TicketPriority)) {
    throw new Error(`AI returned unsupported priority: ${String(value)}`);
  }

  return TicketPriority[value as keyof typeof TicketPriority];
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`AI returned invalid ${label}`);
  }

  return value as Record<string, unknown>;
}

function parseString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`AI returned invalid ${label}`);
  }

  return value.trim();
}

function parseBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`AI returned invalid ${label}`);
  }

  return value;
}

function parseConfidence(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`AI returned invalid ${label}`);
  }

  return Math.max(0, Math.min(1, value));
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

function toApiPriority(priority: TicketPriority): ApiTicketPriority {
  const priorityMap: Record<TicketPriority, ApiTicketPriority> = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    URGENT: "urgent"
  };

  return priorityMap[priority];
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown ticket AI processor error";
}
