import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { KnowledgeBaseModule } from "../knowledge-base/knowledge-base.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [AiModule, KnowledgeBaseModule, PrismaModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService]
})
export class TicketsModule {}
