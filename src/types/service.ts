import type { Ticket } from './ticket';
// Re-export pour rétro-compatibilité — PlanningControle vit maintenant dans planning.ts
export type { PlanningControle } from './planning';

export enum TypeService {
  RESTAURANT = 'restaurant',
  SPORT = 'sport',
  MEDICAL = 'medical',
  CULTURE = 'culture',
  LOGEMENT = 'logement',
  AUTRE = 'autre',
}

export interface Service {
  _id: string;
  nom: string;
  type: TypeService;
  active: boolean;

  // Ticket lié au service (autopopulate, required)
  ticket: Ticket | string;

  // Le planning est maintenant géré via la collection Planning dédiée
  // (voir /planning/restaurant/:id/service/:id)

  createdAt?: Date;
  updatedAt?: Date;
}
