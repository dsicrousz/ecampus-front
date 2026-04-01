import Api from "./Api";
import { Service } from "./Service";

export class VendeurService extends Service {
  constructor() {
    super(Api, 'soldevendeur');
  }

  async getSolde(id: string | number): Promise<any> {
    return this.api.get(`/${this.ressource}/vendeur/${id}`).then((res: any) => res.data);
  }

  async getAllSoldes(): Promise<any[]> {
    return this.api.get(`/${this.ressource}`).then((res: any) => res.data);
  }
}