import { Transform } from "class-transformer";
import { IsIn } from "class-validator";
import { ticketStatusValues, type TicketStatusParam } from "./list-tickets-query.dto";

export class UpdateTicketStatusDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.toLowerCase() : value))
  @IsIn(ticketStatusValues)
  status!: TicketStatusParam;
}
