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
  gerant: {
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
  ticketsacceptes: Ticket[];
  
  // Restaurant (autopopulate)
  restaurant?: {
    _id: string;
    nom: string;
  };
  
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
