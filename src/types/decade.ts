import type { Session } from './session';

export interface Decade {
  _id: string;
  nom: string;
  reference: string;
  dateDebut: Date;
  dateFin: Date;
  active: boolean;
  session: Session;
}
