/**
 * Format de réponse paginée retourné par le backend
 * lorsque les paramètres de pagination sont fournis.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paramètres de pagination envoyés au backend.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  type?: string;
  active?: boolean;
}

/**
 * Type guard : détecte si une réponse est au format paginé ou array simple.
 * Gère la rétro-compatibilité des endpoints backend.
 */
export function isPaginated<T>(response: T[] | PaginatedResult<T>): response is PaginatedResult<T> {
  return !Array.isArray(response) && response !== null && typeof response === 'object' && 'data' in response;
}

// ---- Types pour les endpoints d'agrégation ---------------------------------

/**
 * Réponse de GET /operation/stats/dashboard
 */
export interface DashboardStatsDto {
  totalRecharges: number;
  totalUtilisations: number;
  totalTransferts: number;
  montantRecharges: number;
  montantUtilisations: number;
  montantTransferts: number;
  services: Array<{
    serviceId: string;
    serviceNom: string;
    serviceType: string;
    totalOperations: number;
    totalMontant: number;
    tickets: Array<{
      ticketId: string;
      ticketNom: string;
      ticketPrix: number;
      count: number;
      total: number;
    }>;
  }>;
}

/**
 * Réponse de GET /transfert-versement/stats/flux
 */
export interface FluxStatsDto {
  fluxGlobaux: Array<{
    sourceType: string;
    destinationType: string;
    totalMontant: number;
    count: number;
  }>;
  soldesActeurs: Array<{
    acteurId: string;
    acteurType: string;
    acteurNom: string;
    totalRecu: number;
    totalEnvoye: number;
    solde: number;
  }>;
}

/**
 * Réponse de GET /solde-recouvreur/soldes
 */
export interface SoldeRecouvreurDto {
  recouvreurId: string;
  recouvreurNom: string;
  solde: number;
}

/**
 * Réponse des endpoints findBy* avec withStats=true
 */
export interface TransfertResponseWithStats<T> {
  data: T[];
  stats: {
    enAttente: number;
    valides: number;
    refuses: number;
    montantValide: number;
  };
}

/**
 * Extrait le tableau de données d'une réponse qui peut être soit un array simple
 * (rétro-compatible) soit un objet { data, stats }.
 */
export function unwrapTransfertResponse<T>(
  response: T[] | TransfertResponseWithStats<T>
): { data: T[]; stats: TransfertResponseWithStats<T>['stats'] | null } {
  if (Array.isArray(response)) {
    return { data: response, stats: null };
  }
  return { data: response.data, stats: response.stats };
}
