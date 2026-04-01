import type { Service } from './service';
import type { Ticket } from './ticket';

export interface Plat {
  _id: string;
  nom: string;
  image?: string;
  service: Service | string | { _id: string; nom: string };
  tticket: Ticket;
  description?: string;
  ingredients: string[];
  allergenes: string[];
}
