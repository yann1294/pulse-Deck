import { IsEmail, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

export class CreateTicketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  customerName!: string;

  @IsEmail()
  @MaxLength(255)
  customerEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  attachmentUrl?: string;
}
