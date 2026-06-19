import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import {
  KnowledgeBaseService,
  type KnowledgeDocumentGroupDTO,
  type KnowledgeSearchResultDTO,
  type KnowledgeUploadResultDTO,
  type UploadedKnowledgeFile
} from "./knowledge-base.service";

@Controller("knowledge-base")
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Post("upload")
  @UseGuards(ClerkAuthGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 25 * 1024 * 1024 } }))
  uploadDocument(
    @UploadedFile() file: UploadedKnowledgeFile | undefined,
    @Body("title") title?: string
  ): Promise<KnowledgeUploadResultDTO> {
    return this.knowledgeBaseService.ingestUploadedFile({ file, title });
  }

  @Get("search")
  @UseGuards(ClerkAuthGuard)
  searchDocuments(
    @Query("q") query: string | undefined,
    @Query("limit") limit?: string
  ): Promise<KnowledgeSearchResultDTO[]> {
    return this.knowledgeBaseService.searchRelevantChunks(query ?? "", parseSearchLimit(limit));
  }

  @Get("documents")
  @UseGuards(ClerkAuthGuard)
  listDocuments(): Promise<KnowledgeDocumentGroupDTO[]> {
    return this.knowledgeBaseService.listDocumentGroups();
  }
}

function parseSearchLimit(rawLimit: string | undefined): number {
  if (!rawLimit) {
    return 5;
  }

  const limit = Number(rawLimit);

  if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
    return 5;
  }

  return limit;
}
