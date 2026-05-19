import Api from "./Api";
import { Service } from "./Service";

export interface SoldeCaissierPrincipal {
  solde: number;
}

export class CaissierService extends Service<SoldeCaissierPrincipal> {
  constructor() {
    super(Api, 'solde-caissier-principal');
  }

  async getSolde(id: string | number): Promise<number> {
    return this.api.get(`/${this.ressource}/caissier-principal/${id}/solde`).then((res: any) => res.data);
  }
}