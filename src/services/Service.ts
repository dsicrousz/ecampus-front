import type { AxiosInstance } from "axios";

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
