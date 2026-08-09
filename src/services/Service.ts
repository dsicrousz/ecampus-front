import type { AxiosInstance } from "axios";
import type { PaginationParams } from "@/types/pagination";

/**
 * Construit la query string pour les paramètres de pagination.
 * Retourne une string vide si aucun paramètre n'est fourni.
 */
export function buildPaginationQuery(params?: PaginationParams): string {
  if (!params) return '';
  const parts: string[] = [];
  if (params.page != null) parts.push(`page=${params.page}`);
  if (params.limit != null) parts.push(`limit=${params.limit}`);
  if (params.search) parts.push(`search=${encodeURIComponent(params.search)}`);
  if (params.sortBy) parts.push(`sortBy=${encodeURIComponent(params.sortBy)}`);
  if (params.sortOrder) parts.push(`sortOrder=${params.sortOrder}`);
  if (params.type) parts.push(`type=${encodeURIComponent(params.type)}`);
  if (params.active != null) parts.push(`active=${params.active}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export class Service<TResource = any> {
  protected api: AxiosInstance;
  protected ressource: string;

  constructor(api: AxiosInstance, ressource: string) {
    this.api = api;
    this.ressource = ressource;
  }

  async create(data: any): Promise<TResource> {
    return this.api.post(`/${this.ressource}`, data).then((res) => res.data);
  }

  async getAll(): Promise<TResource[]> {
    return this.api.get(`/${this.ressource}`).then((res) => res.data);
  }

  async getOne(id: string | number): Promise<TResource> {
    return this.api.get(`/${this.ressource}/${id}`).then((res) => res.data);
  }

  async update(id: string | number, data: any): Promise<TResource> {
    return this.api.patch(`/${this.ressource}/${id}`, data).then((res) => res.data);
  }

  async delete(id: string | number): Promise<any> {
    return this.api.delete(`/${this.ressource}/${id}`).then((res: any) => res.data);
  }
}
