import Api from "./Api";
import { Service } from "./Service";
import type {
  TransfertVersement,
  TransfertVendeurRecouvreurDto,
  TransfertRecouvreurCaissierPrincipalDto,
  TransfertCaissierPrincipalAgentComptableDto,
  ValiderTransfertDto,
  TYPE_TRANSFERT
} from "@/types/transfert-versement";
import type { DateRangeParams } from "@/hooks/use-time-range-filter";
import type { FluxStatsDto, TransfertResponseWithStats } from "@/types/pagination";

/**
 * Construit la query string pour les paramètres de période + withStats.
 */
function buildDateQuery(params?: DateRangeParams, withStats?: boolean): string {
  if (!params && !withStats) return '';
  const parts: string[] = [];
  if (params?.dateDebut) parts.push(`dateDebut=${encodeURIComponent(params.dateDebut)}`);
  if (params?.dateFin) parts.push(`dateFin=${encodeURIComponent(params.dateFin)}`);
  if (withStats) parts.push(`withStats=true`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export class TransfertVersementService extends Service {
  constructor() {
    super(Api, 'transfert-versement');
  }

  async createVendeurRecouvreur(data: TransfertVendeurRecouvreurDto): Promise<TransfertVersement> {
    return this.api.post(`/${this.ressource}/vendeur-recouvreur`, data).then((res) => res.data);
  }

  async createRecouvreurCaissierPrincipal(data: TransfertRecouvreurCaissierPrincipalDto): Promise<TransfertVersement> {
    return this.api.post(`/${this.ressource}/recouvreur-caissier-principal`, data).then((res) => res.data);
  }

  async createCaissierPrincipalAgentComptable(data: TransfertCaissierPrincipalAgentComptableDto): Promise<number> {
    return this.api.post(`/${this.ressource}/caissier-principal-agent-comptable`, data).then((res) => res.data);
  }

  async valider(id: string, data: ValiderTransfertDto): Promise<TransfertVersement> {
    return this.api.patch(`/${this.ressource}/${id}/valider`, data).then((res) => res.data);
  }

  async refuser(id: string, data: ValiderTransfertDto): Promise<TransfertVersement> {
    return this.api.patch(`/${this.ressource}/${id}/refuser`, data).then((res) => res.data);
  }

  async findEnAttente(): Promise<TransfertVersement[]> {
    return this.api.get(`/${this.ressource}/en-attente`).then((res) => res.data);
  }

  async findValides(): Promise<TransfertVersement[]> {
    return this.api.get(`/${this.ressource}/valides`).then((res) => res.data);
  }

  async findRefuses(): Promise<TransfertVersement[]> {
    return this.api.get(`/${this.ressource}/refuses`).then((res) => res.data);
  }

  async findByTypeTransfert(typeTransfert: TYPE_TRANSFERT, dateRange?: DateRangeParams): Promise<TransfertVersement[]> {
    return this.api.get(`/${this.ressource}/type/${typeTransfert}${buildDateQuery(dateRange)}`).then((res) => res.data);
  }

  async findByVendeur(vendeurId: string, dateRange?: DateRangeParams, withStats?: boolean): Promise<TransfertVersement[] | TransfertResponseWithStats<TransfertVersement>> {
    return this.api.get(`/${this.ressource}/vendeur/${vendeurId}${buildDateQuery(dateRange, withStats)}`).then((res) => res.data);
  }

  async findByRecouvreur(recouvreurId: string, dateRange?: DateRangeParams, withStats?: boolean): Promise<TransfertVersement[] | TransfertResponseWithStats<TransfertVersement>> {
    return this.api.get(`/${this.ressource}/recouvreur/${recouvreurId}${buildDateQuery(dateRange, withStats)}`).then((res) => res.data);
  }

  async findByCaissierPrincipal(caissierPrincipalId: string, dateRange?: DateRangeParams, withStats?: boolean): Promise<TransfertVersement[] | TransfertResponseWithStats<TransfertVersement>> {
    return this.api.get(`/${this.ressource}/caissier-principal/${caissierPrincipalId}${buildDateQuery(dateRange, withStats)}`).then((res) => res.data);
  }

  async findByAgentComptable(agentComptableId: string, dateRange?: DateRangeParams, withStats?: boolean): Promise<TransfertVersement[] | TransfertResponseWithStats<TransfertVersement>> {
    return this.api.get(`/${this.ressource}/agent-comptable/${agentComptableId}${buildDateQuery(dateRange, withStats)}`).then((res) => res.data);
  }

  async findBySession(sessionId: string): Promise<TransfertVersement[]> {
    return this.api.get(`/${this.ressource}/session/${sessionId}`).then((res) => res.data);
  }

  async getAll(dateRange?: DateRangeParams): Promise<TransfertVersement[]> {
    return this.api.get(`/${this.ressource}${buildDateQuery(dateRange)}`).then((res) => res.data);
  }

  /**
   * Récupère les statistiques des flux financiers (totaux par flux + soldes par acteur).
   * GET /transfert-versement/stats/flux?dateDebut=...&dateFin=...
   * Le backend filtre automatiquement sur etat = VALIDE.
   */
  async getFluxStats(dateRange?: DateRangeParams): Promise<FluxStatsDto> {
    return this.api.get(`/${this.ressource}/stats/flux${buildDateQuery(dateRange)}`).then((res: any) => res.data);
  }
}
