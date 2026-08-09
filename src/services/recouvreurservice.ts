import Api from "./Api";
import { Service } from "./Service";
import type { SoldeRecouvreurDto } from "@/types/pagination";


export class RecouvreurService extends Service<number> {
  constructor() {
    super(Api, 'solde-recouvreur');
  }

  async getSolde(id: string | number): Promise<number> {
    return this.api.get(`/${this.ressource}/recouvreur/${id}/solde`).then((res) => res.data);
  }

  /**
   * Récupère les soldes de tous les recouvreurs en une seule requête.
   * GET /solde-recouvreur/soldes
   */
  async getAllSoldes(): Promise<SoldeRecouvreurDto[]> {
    return this.api.get(`/${this.ressource}/soldes`).then((res) => res.data);
  }
}
