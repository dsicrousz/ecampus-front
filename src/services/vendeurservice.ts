import Api from "./Api";
import { Service } from "./Service";

export interface SoldeVendeur {
  solde: number;
}

export class VendeurService extends Service<SoldeVendeur> {
  constructor() {
    super(Api, 'soldevendeur');
  }

  async getSolde(id: string | number): Promise<SoldeVendeur> {
    return this.api.get(`/${this.ressource}/vendeur/${id}`).then((res) => res.data);
  }

  async getAllSoldes(): Promise<SoldeVendeur[]> {
    return this.api.get(`/${this.ressource}`).then((res) => res.data);
  }
}
