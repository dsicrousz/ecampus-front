export enum ETAT_TRANSFERT {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDE = 'VALIDE',
  REFUSE = 'REFUSE',
  ANNULE = 'ANNULE',
}

export enum TYPE_TRANSFERT {
  VENDEUR_VERS_RECOUVREUR = 'VENDEUR_VERS_RECOUVREUR',
  RECOUVREUR_VERS_CAISSIER_PRINCIPAL = 'RECOUVREUR_VERS_CAISSIER_PRINCIPAL',
  CAISSIER_PRINCIPAL_VERS_AGENT_COMPTABLE = 'CAISSIER_PRINCIPAL_VERS_AGENT_COMPTABLE',
}

export enum TYPE_ACTEUR {
  VENDEUR = 'VENDEUR',
  RECOUVREUR = 'RECOUVREUR',
  CAISSIER_PRINCIPAL = 'CAISSIER_PRINCIPAL',
  AGENT_COMPTABLE = 'AGENT_COMPTABLE',
}

export interface Acteur {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
}

export interface TransfertVersement {
  _id: string;
  typeTransfert: TYPE_TRANSFERT;
  etat: ETAT_TRANSFERT;
  montant: number;
  note?: string;
  
  expediteur: Acteur | string;
  destinataire: Acteur | string;
  
  validateur?: Acteur | string;
  dateValidation?: Date;
  
  session?: string | {
    _id: string;
    annee: string;
  };
  
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TransfertVendeurRecouvreurDto {
  vendeur_id: string;
  recouvreur_id: string;
  montant: number;
  note?: string;
}

export interface TransfertRecouvreurCaissierPrincipalDto {
  recouvreur_id: string;
  caissier_principal_id: string;
  montant: number;
  note?: string;
}

export interface TransfertCaissierPrincipalAgentComptableDto {
  caissier_principal_id: string;
  agent_comptable_id: string;
  montant: number;
  note?: string;
}

export interface ValiderTransfertDto {
  validateur_id: string;
}

export const EtatTransfertColors: Record<ETAT_TRANSFERT, string> = {
  [ETAT_TRANSFERT.EN_ATTENTE]: 'orange',
  [ETAT_TRANSFERT.VALIDE]: 'green',
  [ETAT_TRANSFERT.REFUSE]: 'red',
  [ETAT_TRANSFERT.ANNULE]: 'default',
};

export const EtatTransfertLabels: Record<ETAT_TRANSFERT, string> = {
  [ETAT_TRANSFERT.EN_ATTENTE]: 'En attente',
  [ETAT_TRANSFERT.VALIDE]: 'Validé',
  [ETAT_TRANSFERT.REFUSE]: 'Refusé',
  [ETAT_TRANSFERT.ANNULE]: 'Annulé',
};

export const TypeTransfertLabels: Record<TYPE_TRANSFERT, string> = {
  [TYPE_TRANSFERT.VENDEUR_VERS_RECOUVREUR]: 'Vendeur → Recouvreur',
  [TYPE_TRANSFERT.RECOUVREUR_VERS_CAISSIER_PRINCIPAL]: 'Recouvreur → Caissier Principal',
  [TYPE_TRANSFERT.CAISSIER_PRINCIPAL_VERS_AGENT_COMPTABLE]: 'Caissier Principal → Agent Comptable',
};
