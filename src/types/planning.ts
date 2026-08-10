/**
 * Créneau de contrôle planifié.
 * jour : 0 = lundi, 6 = dimanche
 * heures au format "HH:MM"
 */
export interface PlanningControle {
  jour: number;
  heureDebut: string;
  heureFin: string;
  agents: string[];
}

/**
 * Document Planning liant un restaurant à un service.
 * Le champ s'appelle `creneaux` (pas `planning`).
 */
export interface Planning {
  _id: string;
  restaurant: {
    _id: string;
    nom: string;
  };
  service: {
    _id: string;
    nom: string;
    type: string;
  };
  creneaux: PlanningControle[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload de création d'un planning.
 * restaurant et service sont des IDs string.
 */
export interface CreatePlanningDto {
  restaurant: string;
  service: string;
  creneaux?: PlanningControle[];
  active?: boolean;
}

/**
 * Payload de mise à jour d'un planning.
 */
export interface UpdatePlanningDto {
  restaurant?: string;
  service?: string;
  creneaux?: PlanningControle[];
  active?: boolean;
}
