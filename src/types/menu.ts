import type { Plat } from './plat';
import type { Restaurant } from './restaurant';

export interface Menu {
  _id: string;
  nom: string;
  date: string;
  restaurant: Restaurant | string | { _id: string; nom: string };
  plats: Plat[] | string[] | Array<{ _id: string; nom: string; service?: { _id: string; nom: string; type: string }; image?: string }>;
  notes?: string;
}
