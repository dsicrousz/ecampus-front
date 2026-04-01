import Api from "./Api";
import { Service } from "./Service";

export class PubService extends Service {
  constructor() {
    super(Api, 'pub');
  }
}