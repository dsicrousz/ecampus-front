import type { Restaurant } from './restaurant';
import type { Service } from './service';

export interface Plat {
  _id: string;
  nom: string;
  image?: string;
  restaurant: Restaurant | string | { _id: string; nom: string };
  service: Service | string | { _id: string; nom: string; type: string };
  description?: string;
  ingredients: string[];
  allergenes: string[];
}
