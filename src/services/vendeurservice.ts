import Api from "./Api";
import { Service } from "./Service";


export class VendeurService extends Service<number> {
  constructor() {
    super(Api, 'soldevendeur');
  }

  async getSolde(id: string | number): Promise<number> {
    return this.api.get(`/${this.ressource}/vendeur/${id}/solde`).then((res) => res.data);
  }

  async getAllSoldes(): Promise<any[]> {
    return this.api.get(`/${this.ressource}`).then((res) => res.data);
  }
}
