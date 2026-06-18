import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import {
  KnowledgeBaseService,
  type KnowledgeDocumentGroupDTO,
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

  @Get("documents")
  @UseGuards(ClerkAuthGuard)
  listDocuments(): Promise<KnowledgeDocumentGroupDTO[]> {
    return this.knowledgeBaseService.listDocumentGroups();
  }
}
