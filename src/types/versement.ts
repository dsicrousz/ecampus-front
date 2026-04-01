export enum EtatVersement {
  ENCOURS = 'ENCOURS',
  VALIDE = 'VALIDE',
  REFUSE = 'REFUSE',
}

export interface Versement {
  _id: string;
  transaction_id: string;
  
  // Vendeur (autopopulate)
  vendeur_id: string | {
    _id: string;
    nom: string;
    prenom: string;
  };
  
  montant: number;
  note?: string;
  etat: EtatVersement;
  
  // Caissier (autopopulate)
  caissier_id: string | {
    _id: string;
    nom: string;
    prenom: string;
  };
  
  // Session (autopopulate)
  session: string | {
    _id: string;
    annee: string;
  };
  
  createdAt?: Date;
  updatedAt?: Date;
}
