import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import type { PaginatedResponse } from "@pulsedesk/shared";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import {
  AiSuggestionsService,
  type AiSuggestionListItemDTO
} from "./ai-suggestions.service";
import { ListAiSuggestionsQueryDto } from "./dto/list-ai-suggestions-query.dto";

@Controller("ai-suggestions")
export class AiSuggestionsController {
  constructor(private readonly aiSuggestionsService: AiSuggestionsService) {}

  @Get()
  @UseGuards(ClerkAuthGuard)
  listAiSuggestions(
    @Query() query: ListAiSuggestionsQueryDto
  ): Promise<PaginatedResponse<AiSuggestionListItemDTO>> {
    return this.aiSuggestionsService.listAiSuggestions(query);
  }
}
