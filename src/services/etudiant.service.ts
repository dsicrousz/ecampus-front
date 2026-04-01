import Api from "./Api";
import { Service } from "./Service";

export class EtudiantService extends Service {
  constructor() {
    super(Api, 'etudiant');
  }

  async getInscription(id: string | number): Promise<any> {
    return this.api.get(`/${this.ressource}/inscription/${id}`).then((res: any) => res.data);
  }
}