import { Transform } from "class-transformer";
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export const ticketMessageAuthorTypeValues = ["ADMIN", "CUSTOMER"] as const;

export type TicketMessageAuthorTypeParam = (typeof ticketMessageAuthorTypeValues)[number];

export class CreateTicketMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.toUpperCase() : value))
  @IsIn(ticketMessageAuthorTypeValues)
  authorType?: TicketMessageAuthorTypeParam;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  authorEmail?: string;
}
