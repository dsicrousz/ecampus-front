import type { Ticket } from "@/types/ticket";
import Api from "./Api";
import { Service } from "./Service";

export class TicketService extends Service<Ticket> {
  constructor() {
    super(Api, 'tickets');
  }

  async byService(serviceId: string | number): Promise<Ticket[]> {
    return this.api.get(`/${this.ressource}/service/${serviceId}`).then((res) => res.data);
  }

  async byControle(serviceId: string | number): Promise<Ticket[]> {
    return this.api.get(`/${this.ressource}/controle/${serviceId}`).then((res) => res.data);
  }

  async byActive(): Promise<Ticket[]> {
    return this.api.get(`/${this.ressource}/active`).then((res) => res.data);
  }

  async utiliserTicket(data: any): Promise<any> {
    return this.api.post(`/${this.ressource}/utiliser`, data).then((res: any) => res.data);
  }

}
