import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import type { PaginatedResponse } from "@pulsedesk/shared";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import { CustomersService, type CustomerDetailDTO, type CustomerListItemDTO } from "./customers.service";
import { ListCustomersQueryDto } from "./dto/list-customers-query.dto";

@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @UseGuards(ClerkAuthGuard)
  listCustomers(@Query() query: ListCustomersQueryDto): Promise<PaginatedResponse<CustomerListItemDTO>> {
    return this.customersService.listCustomers(query);
  }

  @Get(":id")
  @UseGuards(ClerkAuthGuard)
  getCustomer(@Param("id") id: string): Promise<CustomerDetailDTO> {
    return this.customersService.getCustomerById(id);
  }
}
