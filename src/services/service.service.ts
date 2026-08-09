import type { Service as ServiceType } from "@/types/service";
import Api from "./Api";
import { Service, buildPaginationQuery } from "./Service";
import type { PaginatedResult, PaginationParams } from "@/types/pagination";

export class ServiceService extends Service<ServiceType>{
constructor(){
    super(Api,'service');
}

async active(): Promise<ServiceType[]> {
    return this.api.get(`/${this.ressource}/active`).then(res => res.data);
  }

async byagent(agentId:string):Promise<ServiceType[]> {
    return this.api.get(`/${this.ressource}/by-agent-controle/${agentId}`).then(res => res.data);
  }

async byGerant(gerantId:string):Promise<ServiceType[]> {
    return this.api.get(`/${this.ressource}/by-gerant/${gerantId}`).then(res => res.data);
  }

  async getByType(type:string):Promise<ServiceType[]> {
    return this.api.get(`/${this.ressource}/bytype/${type}`).then(res => res.data);
  }

  /**
   * Récupère les services avec pagination côté backend.
   */
  async getPaginated(params: PaginationParams): Promise<PaginatedResult<ServiceType>> {
    return this.api.get(`/${this.ressource}${buildPaginationQuery(params)}`).then((res: any) => res.data);
  }

}
