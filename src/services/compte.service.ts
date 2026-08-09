import type { Compte } from "@/types/compte";
import Api from "./Api";
import { Service } from "./Service";
import type { PaginatedResult, PaginationParams } from "@/types/pagination";

function buildPaginationQuery(params?: PaginationParams): string {
  if (!params) return '';
  const parts: string[] = [];
  if (params.page != null) parts.push(`page=${params.page}`);
  if (params.limit != null) parts.push(`limit=${params.limit}`);
  if (params.search) parts.push(`search=${encodeURIComponent(params.search)}`);
  if (params.sortBy) parts.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
  if (params.sortOrder) parts.push(`sortOrder=${params.sortOrder}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

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

  /**
   * Récupère les comptes avec pagination côté backend.
   * Retourne un PaginatedResult<Compte>.
   */
  async getPaginated(params: PaginationParams): Promise<PaginatedResult<Compte>> {
    return this.api.get(`/${this.ressource}${buildPaginationQuery(params)}`).then((res: any) => res.data);
  }

  /**
   * Récupère le solde total de tous les comptes.
   */
  async getTotalSolde(): Promise<number> {
    return this.api.get(`/${this.ressource}/total-solde`).then((res: any) => res.data);
  }

  /**
   * Compte le nombre total de comptes.
   */
  async getCount(): Promise<number> {
    return this.api.get(`/${this.ressource}/count`).then((res: any) => res.data);
  }
}
