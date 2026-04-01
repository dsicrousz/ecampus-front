import Api from "./Api";
import { Service } from "./Service";

export class VersementService extends Service {
  constructor() {
    super(Api, 'versement');
  }

  async validate(id: string | number): Promise<any> {
    return this.api.patch(`/${this.ressource}/validate/${id}`).then((res: any) => res.data);
  }

  async refuse(id: string | number): Promise<any> {
    return this.api.patch(`/${this.ressource}/refuse/${id}`).then((res: any) => res.data);
  }

  async getByCaissier(id: string | number, debut: string, fin: string): Promise<any> {
    return this.api.get(`/${this.ressource}/caissier/${id}?dateDebut=${debut}&dateFin=${fin}`).then((res: any) => res.data);
  }

  async getByVendeur(id: string | number, debut?: string, fin?: string): Promise<any> {
    if (debut && fin) {
      return this.api.get(`/${this.ressource}/vendeur/${id}?dateDebut=${debut}&dateFin=${fin}`).then((res: any) => res.data);
    }
    return this.api.get(`/${this.ressource}/vendeur/${id}`).then((res: any) => res.data);
  }

  /**
   * Récupère les versements par état
   * @param {string} etat - VALIDE, ENCOURS, REFUSE
   * @returns {Promise<Array>}
   */
  async getByEtat(etat: string): Promise<any> {
    return this.api.get(`/${this.ressource}/etat/${etat}`).then((res: any) => res.data);
  }

  /**
   * Récupère les versements en cours
   * @returns {Promise<Array>}
   */
  async getEnCours(): Promise<any> {
    return this.getByEtat('ENCOURS');
  }

  /**
   * Récupère les versements validés
   * @returns {Promise<Array>}
   */
  async getValides(): Promise<any> {
    return this.getByEtat('VALIDE');
  }

  /**
   * Récupère les versements refusés
   * @returns {Promise<Array>}
   */
  async getRefuses(): Promise<any> {
    return this.getByEtat('REFUSE');
  }

  /**
   * Change l'état d'un versement
   * @param {string} id - ID du versement
   * @param {string} etat - Nouvel état (VALIDE, ENCOURS, REFUSE)
   * @returns {Promise<Object>}
   */
  async changeEtat(id: string | number, etat: string): Promise<any> {
    return this.api.patch(`/${this.ressource}/${id}/etat`, { etat }).then((res: any) => res.data);
  }
}