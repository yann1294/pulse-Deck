import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ApproveAiSuggestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  finalReply!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
