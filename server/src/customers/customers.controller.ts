import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import type { PaginatedResponse } from "@pulsedesk/shared";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import {
  CustomersService,
  type CustomerDetailDTO,
  type CustomerListItemDTO,
  type CustomerTimelineEventDTO
} from "./customers.service";
import { ListCustomersQueryDto } from "./dto/list-customers-query.dto";

@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @UseGuards(ClerkAuthGuard)
  listCustomers(@Query() query: ListCustomersQueryDto): Promise<PaginatedResponse<CustomerListItemDTO>> {
    return this.customersService.listCustomers(query);
  }

  @Get(":id/timeline")
  @UseGuards(ClerkAuthGuard)
  getCustomerTimeline(@Param("id") id: string): Promise<CustomerTimelineEventDTO[]> {
    return this.customersService.getCustomerTimeline(id);
  }

  @Get(":id")
  @UseGuards(ClerkAuthGuard)
  getCustomer(@Param("id") id: string): Promise<CustomerDetailDTO> {
    return this.customersService.getCustomerById(id);
  }
}
