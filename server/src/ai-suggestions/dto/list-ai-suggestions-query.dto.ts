import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export const aiSuggestionStatusValues = ["pending", "generated", "approved", "edited", "failed"] as const;

export type AiSuggestionStatusParam = (typeof aiSuggestionStatusValues)[number];

export class ListAiSuggestionsQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.toLowerCase() : value))
  @IsIn(aiSuggestionStatusValues)
  status?: AiSuggestionStatusParam;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
