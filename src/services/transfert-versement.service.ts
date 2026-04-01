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

  async createCaissierPrincipalAgentComptable(data: TransfertCaissierPrincipalAgentComptableDto): Promise<TransfertVersement> {
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

  async findByTypeTransfert(typeTransfert: TYPE_TRANSFERT): Promise<TransfertVersement[]> {
    return this.api.get(`/${this.ressource}/type/${typeTransfert}`).then((res) => res.data);
  }

  async findByVendeur(vendeurId: string): Promise<TransfertVersement[]> {
    return this.api.get(`/${this.ressource}/vendeur/${vendeurId}`).then((res) => res.data);
  }

  async findByRecouvreur(recouvreurId: string): Promise<TransfertVersement[]> {
    return this.api.get(`/${this.ressource}/recouvreur/${recouvreurId}`).then((res) => res.data);
  }

  async findByCaissierPrincipal(caissierPrincipalId: string): Promise<TransfertVersement[]> {
    return this.api.get(`/${this.ressource}/caissier-principal/${caissierPrincipalId}`).then((res) => res.data);
  }

  async findByAgentComptable(agentComptableId: string): Promise<TransfertVersement[]> {
    return this.api.get(`/${this.ressource}/agent-comptable/${agentComptableId}`).then((res) => res.data);
  }

  async findBySession(sessionId: string): Promise<TransfertVersement[]> {
    return this.api.get(`/${this.ressource}/session/${sessionId}`).then((res) => res.data);
  }
}
