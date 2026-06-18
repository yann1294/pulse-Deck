import { Module } from "@nestjs/common";
import { ChunkerService } from "./chunker.service";
import { DocumentParserService } from "./document-parser.service";
import { KnowledgeBaseController } from "./knowledge-base.controller";
import { KnowledgeBaseService } from "./knowledge-base.service";

@Module({
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, DocumentParserService, ChunkerService],
  exports: [KnowledgeBaseService, DocumentParserService, ChunkerService]
})
export class KnowledgeBaseModule {}
