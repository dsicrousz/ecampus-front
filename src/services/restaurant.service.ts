import { type Restaurant } from "@/types/restaurant";
import Api from "./Api";
import { Service, buildPaginationQuery } from "./Service";
import type { PaginatedResult, PaginationParams } from "@/types/pagination";

export class RestaurantService extends Service<Restaurant> {
  constructor() {
    super(Api, 'restaurants');
  }

  async active(): Promise<Restaurant[]> {
    return this.api.get(`/${this.ressource}/active`).then((res: any) => res.data);
  }

  async bySuperviseur(id: string): Promise<Restaurant[]> {
    return this.api.get(`/${this.ressource}/superviseur/${id}`).then((res: any) => res.data);
  }

  async byRepreneur(id: string): Promise<Restaurant[]> {
    return this.api.get(`/${this.ressource}/repreneur/${id}`).then((res: any) => res.data);
  }

  async byAgent(agentId: string): Promise<Restaurant[]> {
    return this.api.get(`/${this.ressource}/by-agent-controle/${agentId}`).then((res: any) => res.data);
  }

  async getRepreneurDashboard(repreneurId: string): Promise<any> {
    return this.api.get(`/repreneur/dashboard/${repreneurId}`).then((res: any) => res.data);
  }

  /**
   * Récupère les restaurants avec pagination côté backend.
   */
  async getPaginated(params: PaginationParams): Promise<PaginatedResult<Restaurant>> {
    return this.api.get(`/${this.ressource}${buildPaginationQuery(params)}`).then((res: any) => res.data);
  }
}
