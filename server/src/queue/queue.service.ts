import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { JobsOptions, Queue } from "bullmq";

export const TICKET_AI_QUEUE_NAME = "ticket-ai";

export type TicketAiJobName = "classify" | "prioritize" | "suggest-reply";

export interface TicketAiJobData {
  ticketId: string;
}

export interface EnqueuedTicketAiJob {
  id: string | number | undefined;
  name: TicketAiJobName;
}

@Injectable()
export class QueueService {
  private readonly ticketAiJobOptions: JobsOptions = {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000
    },
    removeOnComplete: {
      age: 60 * 60,
      count: 100
    },
    removeOnFail: {
      age: 24 * 60 * 60,
      count: 200
    }
  };

  constructor(
    @InjectQueue(TICKET_AI_QUEUE_NAME)
    private readonly ticketAiQueue: Queue<TicketAiJobData, unknown, TicketAiJobName>
  ) {}

  async enqueueTicketAi(ticketId: string): Promise<EnqueuedTicketAiJob[]> {
    const normalizedTicketId = ticketId.trim();

    if (!normalizedTicketId) {
      throw new BadRequestException("ticketId is required to enqueue ticket AI jobs");
    }

    const jobData: TicketAiJobData = { ticketId: normalizedTicketId };
    const jobs = await Promise.all([
      this.ticketAiQueue.add("classify", jobData, this.ticketAiJobOptions),
      this.ticketAiQueue.add("prioritize", jobData, this.ticketAiJobOptions),
      this.ticketAiQueue.add("suggest-reply", jobData, this.ticketAiJobOptions)
    ]);

    return jobs.map((job) => ({
      id: job.id,
      name: job.name
    }));
  }
}
