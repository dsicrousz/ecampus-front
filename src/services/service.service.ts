import type { Service as ServiceType } from "@/types/service";
import Api from "./Api";
import { Service } from "./Service";

export class ServiceService extends Service{
constructor(){
    super(Api,'service');
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

}