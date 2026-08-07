import type { Ticket } from './ticket';

export enum TypeService {
  RESTAURANT = 'restaurant',
  SPORT = 'sport',
  MEDICAL = 'medical',
  CULTURE = 'culture',
  LOGEMENT = 'logement',
  AUTRE = 'autre',
}

export interface PlanningControle {
  jour: number;
  heureDebut: string;
  heureFin: string;
  agents: string[];
}

export interface Service {
  _id: string;
  nom: string;
  type: TypeService;
  active: boolean;

  // Ticket lié au service (autopopulate, required)
  ticket: Ticket | string;

  // Planning de contrôle
  planning?: PlanningControle[];

  createdAt?: Date;
  updatedAt?: Date;
}
