import Api from "./Api";
import { Service } from "./Service";

export class OperationService extends Service {
  constructor() {
    super(Api, 'operation');
  }

  /**
   * Récupère les statistiques des services restaurant
   */
  async getRestaurantService(): Promise<any> {
    return this.api.get(`/${this.ressource}/stats/servicerestaurant`).then((res: any) => res.data);
  }

  /**
   * Récupère les opérations par période
   */
  async getByDate(debut: string, fin: string): Promise<any> {
    return this.api.get(`/${this.ressource}?dateDebut=${debut}&dateFin=${fin}`).then((res: any) => res.data);
  }

  /**
   * Crée une opération de RECHARGE
   * @param {Object} data - Données de la recharge
   * @param {string} data.compte - ID du compte à recharger
   * @param {number} data.montant - Montant de la recharge
   * @param {string} data.agentControle - ID de l'agent effectuant la recharge
   * @param {string} [data.note] - Note optionnelle
   */
  async recharge(data: any): Promise<any> {
    const operationData = {
      ...data,
      type: 'RECHARGE'
    };
    return this.api.post(`/${this.ressource}`, operationData).then((res: any) => res.data);
  }

  /**
   * Crée une opération d'UTILISATION
   * @param {Object} data - Données de l'utilisation
   * @param {string} data.compte - ID du compte
   * @param {number} data.montant - Montant de l'utilisation
   * @param {string} [data.ticket] - ID du ticket (optionnel)
   * @param {string} [data.service] - ID du service (optionnel)
   * @param {string} [data.decade] - ID de la décade (optionnel)
   * @param {string} data.agentControle - ID de l'agent
   * @param {string} [data.note] - Note optionnelle
   */
  async utilisation(data: any): Promise<any> {
    const operationData = {
      ...data,
      type: 'UTILISATION'
    };
    return this.api.post(`/${this.ressource}`, operationData).then((res: any) => res.data);
  }

  /**
   * Crée une opération de TRANSFERT
   * @param {Object} data - Données du transfert
   * @param {string} data.compte - ID du compte source
   * @param {string} data.compteDestinataire - ID du compte destinataire
   * @param {number} data.montant - Montant du transfert
   * @param {string} [data.agentControle] - ID de l'agent (optionnel)
   * @param {string} [data.note] - Note optionnelle
   */
  async transfert(data: any): Promise<any> {
    const operationData = {
      ...data,
      type: 'TRANSFERT'
    };
    return this.api.post(`/${this.ressource}`, operationData).then((res: any) => res.data);
  }

  // ===== Méthodes legacy (à conserver pour compatibilité) =====

  async depot(data: any): Promise<any> {
    return this.api.post(`/${this.ressource}/depot`, data).then((res: any) => res.data);
  }

  async recuperationTicket(data: any): Promise<any> {
    return this.api.post(`/${this.ressource}/recuperationticket`, data).then((res: any) => res.data);
  }

  async retrait(data: any): Promise<any> {
    return this.api.post(`/${this.ressource}/retrait`, data).then((res: any) => res.data);
  }

  async retraitByCode(code: string, data: any): Promise<any> {
    return this.api.post(`/${this.ressource}/retraitbycode/${code}`, data).then((res: any) => res.data);
  }

  /**
   * Récupère les opérations d'un compte
   */
  async byCompte(id: string | number): Promise<any> {
    return this.api.get(`/${this.ressource}/compte/${id}`).then((res: any) => res.data);
  }

  /**
   * Récupère les opérations d'un responsable
   */
  async byResponsable(id: string | number): Promise<any> {
    return this.api.get(`/${this.ressource}/agent/${id}`).then((res: any) => res.data);
  }

  /**
   * Récupère les opérations d'un service par période
   */
  async byService(id: string | number, debut?: string, fin?: string): Promise<any> {
    return this.api.get(`/${this.ressource}/service/${id}?dateDebut=${debut}&dateFin=${fin}`).then((res: any) => res.data);
  }

  async getAllDepots(): Promise<any> {
    return this.api.get(`/${this.ressource}/alldepots`).then((res: any) => res.data);
  }

  async getAllRetraits(): Promise<any> {
    return this.api.get(`/${this.ressource}/allretraits`).then((res: any) => res.data);
  }

  async getAllRetraitsByRestaurant(id: string | number): Promise<any> {
    return this.api.post(`/${this.ressource}/allretraitsbyrestaurant/${id}`).then((res: any) => res.data);
  }

  async byTicket(id: string): Promise<any> {
    return this.api.get(`/${this.ressource}/ticket/${id}`).then((res: any) => res.data);
  }

  /**
   * Récupère les opérations d'un agent (RECHARGE et UTILISATION uniquement)
   * Le backend ne supporte pas le filtrage par période, donc on filtre côté client
   */
  async byAgent(id: string): Promise<any> {
    return this.api.get(`/${this.ressource}/agent/${id}`).then((res: any) => res.data);
  }

  /**
   * Récupère les opérations par type
   */
  async byType(type: string): Promise<any> {
    return this.api.get(`/${this.ressource}/type/${type}`).then((res: any) => res.data);
  }

  /**
   * Récupère les opérations par période (tous types confondus)
   */
  async byPeriod(startDate: string, endDate: string): Promise<any> {
    return this.api.get(`/${this.ressource}/period?startDate=${startDate}&endDate=${endDate}`).then((res: any) => res.data);
  }

  /**
   * Récupère les opérations d'une décade
   */
  async byDecade(decadeId: string): Promise<any> {
    return this.api.get(`/${this.ressource}/decade/${decadeId}`).then((res: any) => res.data);
  }

   async byDecadeAndService(decadeId: string, serviceId: string): Promise<any> {
    return this.api.get(`/${this.ressource}/decade/${decadeId}/service/${serviceId}`).then((res: any) => res.data);
  }

  async bySession(sessionId: string): Promise<any> {
    return this.api.get(`/${this.ressource}/session/${sessionId}`).then((res: any) => res.data);
  }

  async hasConsumedToday(compteId: string, ticketType: string): Promise<any> {
    return this.api.get(`/${this.ressource}/hasconsumedtoday/${compteId}?ticketType=${ticketType}`).then((res: any) => res.data);
  }
}