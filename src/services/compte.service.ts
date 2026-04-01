import Api from "./Api";
import { Service } from "./Service";

export class CompteService extends Service {
  constructor() {
    super(Api, 'compte');
  }

  async byEtudiant(id: string | number): Promise<any> {
    return this.api.get(`/${this.ressource}/etudiant/${id}`).then((res: any) => res.data);
  }

  async byCode(code: string): Promise<any> {
    return this.api.get(`/${this.ressource}/code/${code}`).then((res: any) => res.data);
  }

  async toggleState(id: string, data: any): Promise<any> {
    return this.api.patch(`/${this.ressource}/toggle/${id}`, data).then((res: any) => res.data);
  }

}