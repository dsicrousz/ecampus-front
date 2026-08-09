import Api from "./Api";
import { Service } from "./Service";
import type { Etudiant } from "@/types/etudiant";
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

export class EtudiantService extends Service {
  constructor() {
    super(Api, 'etudiant');
  }

  async getInscription(id: string | number): Promise<any> {
    return this.api.get(`/${this.ressource}/inscription/${id}`).then((res: any) => res.data);
  }

  /**
   * Récupère les étudiants avec pagination côté backend.
   * Retourne un PaginatedResult<Etudiant>.
   */
  async getPaginated(params: PaginationParams): Promise<PaginatedResult<Etudiant>> {
    return this.api.get(`/${this.ressource}${buildPaginationQuery(params)}`).then((res: any) => res.data);
  }
}
