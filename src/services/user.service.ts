import type { User } from "@/types/user";
import Api from "./Api";
import { Service } from "./Service";

export class UserService extends Service {
  constructor() {
    super(Api, 'user');
  }

 async byRole(role:string): Promise<User[]> {
    return this.api.get(`/${this.ressource}/byrole/${role}`).then((res: any) => res.data);
  }
}