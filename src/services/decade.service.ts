import Api from "./Api";
import { Service } from "./Service";
import type { Decade } from '@/types/decade';
import type { Operation } from '@/types/operation';

export class DecadeService extends Service {
  constructor() {
    super(Api, 'decades');
  }

  async getAll(): Promise<Decade[]> {
    return this.api.get(`/${this.ressource}`).then((res: any) => res.data);
  }

  async getOne(id: string): Promise<Decade> {
    return this.api.get(`/${this.ressource}/${id}`).then((res: any) => res.data);
  }

  async getOperations(decadeId: string, restaurantId: string): Promise<Operation[]> {
    return this.api.get(`/${this.ressource}/operations/${decadeId}/${restaurantId}`).then((res: any) => res.data);
  }

  async byService(serviceId: string): Promise<Decade[]> {
    return this.api.get(`/${this.ressource}/by-service/${serviceId}`).then((res: any) => res.data);
  }
}
