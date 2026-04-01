import type { Compte } from './compte';
import type { Ticket } from './ticket';
import type { Service } from './service';

export type TypeOperation = 'RECHARGE' | 'UTILISATION' | 'TRANSFERT' | 'REMBOURSEMENT';

export interface Operation {
  _id: string;
  type: TypeOperation;
  montant: number;
  
  // Compte source (pour RECHARGE, UTILISATION, TRANSFERT)
  compte: Compte;
  
  // Compte destinataire (uniquement pour TRANSFERT)
  compteDestinataire?: Compte | string;
  
  // Ticket (pour UTILISATION)
  ticket?: string;

  ticketSnapshot?: Partial<Ticket>;
  
  // Service (pour UTILISATION)
  serviceSnapshot?: Partial<Service>;

  service:string;
  
  // Decade (pour UTILISATION de restaurant)
  decade?: string | {
    _id: string;
    [key: string]: any;
  };
  
  // Agent de contrôle
  agentControle?: string | {
    _id: string;
    nom: string;
    prenom: string;
  };
  
  // Session académique
  session: string | {
    _id: string;
    annee: string;
  };
  
  // Note ou description
  note?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export const TypeOperationColors: Record<TypeOperation, string> = {
  RECHARGE: 'green',
  UTILISATION: 'blue',
  TRANSFERT: 'orange',
  REMBOURSEMENT: 'purple'
}

export const TypeOperationLabels: Record<TypeOperation, string> = {
  RECHARGE: 'Recharge',
  UTILISATION: 'Utilisation',
  TRANSFERT: 'Transfert',
  REMBOURSEMENT: 'Remboursement'
}

export const formatMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-SN', { 
    style: 'currency', 
    currency: 'XOF' 
  }).format(montant)
}

export const getOperationDescription = (operation: Operation): string => {
  switch (operation.type) {
    case 'RECHARGE':
      return `Recharge de ${formatMontant(operation.montant)}`
    case 'UTILISATION':
      return operation.note || `Utilisation de ${formatMontant(operation.montant)}`
    case 'TRANSFERT':
      return `Transfert de ${formatMontant(operation.montant)}`
    case 'REMBOURSEMENT':
      return `Remboursement de ${formatMontant(operation.montant)}`
    default:
      return operation.note || 'Opération'
  }
}
