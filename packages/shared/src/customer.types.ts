export interface CustomerDTO {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  externalId?: string;
  ticketCount: number;
  createdAt: string;
  updatedAt: string;
}
