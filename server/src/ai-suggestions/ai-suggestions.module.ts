import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AiSuggestionsController } from "./ai-suggestions.controller";
import { AiSuggestionsService } from "./ai-suggestions.service";

@Module({
  imports: [PrismaModule],
  controllers: [AiSuggestionsController],
  providers: [AiSuggestionsService],
  exports: [AiSuggestionsService]
})
export class AiSuggestionsModule {}
