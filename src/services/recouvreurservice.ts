import Api from "./Api";
import { Service } from "./Service";


export class RecouvreurService extends Service<number> {
  constructor() {
    super(Api, 'solde-recouvreur');
  }

  async getSolde(id: string | number): Promise<number> {
    return this.api.get(`/${this.ressource}/recouvreur/${id}/solde`).then((res) => res.data);
  }
}
