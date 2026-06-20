import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { KnowledgeBaseModule } from "../knowledge-base/knowledge-base.module";
import { PrismaModule } from "../prisma/prisma.module";
import { QueueModule } from "../queue/queue.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [AiModule, KnowledgeBaseModule, PrismaModule, QueueModule, RealtimeModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService]
})
export class TicketsModule {}
