import type { Compte } from "@/types/compte";
import Api from "./Api";
import { Service } from "./Service";

export class CompteService extends Service<Compte> {
  constructor() {
    super(Api, 'compte');
  }

  async byEtudiant(id: string | number): Promise<Compte> {
    return this.api.get(`/${this.ressource}/etudiant/${id}`).then((res) => res.data);
  }

  async byCode(code: string): Promise<Compte> {
    return this.api.get(`/${this.ressource}/code/${code}`).then((res) => res.data);
  }

  async toggleState(id: string, data: any): Promise<any> {
    return this.api.patch(`/${this.ressource}/toggle/${id}`, data).then((res: any) => res.data);
  }

}
