import Api from "./Api";
import { Service, buildPaginationQuery } from "./Service";
import type { Decade } from '@/types/decade';
import type { Operation } from '@/types/operation';
import type { PaginatedResult, PaginationParams } from "@/types/pagination";

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

  /**
   * Récupère les décades avec pagination côté backend.
   */
  async getPaginated(params: PaginationParams): Promise<PaginatedResult<Decade>> {
    return this.api.get(`/${this.ressource}${buildPaginationQuery(params)}`).then((res: any) => res.data);
  }
}
