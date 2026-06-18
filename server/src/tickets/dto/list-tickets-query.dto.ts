import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export const ticketStatusValues = ["open", "in_progress", "waiting_customer", "resolved"] as const;
export const ticketPriorityValues = ["low", "medium", "high", "urgent"] as const;
export const ticketCategoryValues = [
  "billing",
  "technical",
  "account",
  "bug",
  "feature_request",
  "other"
] as const;

export type TicketStatusParam = (typeof ticketStatusValues)[number];
export type TicketPriorityParam = (typeof ticketPriorityValues)[number];
export type TicketCategoryParam = (typeof ticketCategoryValues)[number];

export class ListTicketsQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.toLowerCase() : value))
  @IsIn(ticketStatusValues)
  status?: TicketStatusParam;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.toLowerCase() : value))
  @IsIn(ticketPriorityValues)
  priority?: TicketPriorityParam;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.toLowerCase() : value))
  @IsIn(ticketCategoryValues)
  category?: TicketCategoryParam;

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
