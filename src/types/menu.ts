import type { Plat } from './plat';
import type { Service } from './service';

export interface Menu {
  _id: string;
  nom: string;
  date: string;
  service: Service | string | { _id: string; nom: string };
  plats: Plat[] | string[] | Array<{ _id: string; nom: string; typePlat: string; image?: string }>;
  notes?: string;
}
