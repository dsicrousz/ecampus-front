import type { Ticket } from './ticket';

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
  typeService: TypeService;
  
  // Gérant (autopopulate)
  gerant: string | {
    _id: string;
    nom: string;
    prenom: string;
    email: string;
    role?: string[];
  };
  
  // Agents de contrôle (autopopulate)
  agentsControle: Array<string | {
    _id: string;
    nom: string;
    prenom: string;
    email: string;
    role?: string[];
  }>;
  
  // Tickets acceptés (autopopulate)
  ticketsacceptes: Ticket[] | string[];
  
  // Prix par type de ticket (Map)
  prixRepreneur: Record<string, number>;
  
  active: boolean;
  localisation?: string;
  nombre_de_places?: number;
  description?: string;
  
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
}
