import Api from "./Api";
import { Service } from "./Service";

export class CaissierService extends Service {
  constructor() {
    super(Api, 'soldecaissier');
  }

  async getSolde(id: string | number): Promise<any> {
    return this.api.get(`/${this.ressource}/caissier/${id}`).then((res: any) => res.data);
  }
}