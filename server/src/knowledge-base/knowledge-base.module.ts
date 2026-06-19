import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ChunkerService } from "./chunker.service";
import { DocumentParserService } from "./document-parser.service";
import { KnowledgeBaseController } from "./knowledge-base.controller";
import { KnowledgeBaseService } from "./knowledge-base.service";

@Module({
  imports: [AiModule, PrismaModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, DocumentParserService, ChunkerService],
  exports: [KnowledgeBaseService, DocumentParserService, ChunkerService]
})
export class KnowledgeBaseModule {}
