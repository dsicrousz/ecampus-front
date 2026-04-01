import Api from "./Api";
import { Service } from "./Service";

export class PlatService extends Service {
  constructor() {
    super(Api, 'dishes');
  }

  /**
   * Récupère tous les plats d'un restaurant spécifique
   * @param {string} restaurantId - ID du restaurant
   * @returns {Promise} Liste des plats du restaurant
   */
  async byRestaurant(restaurantId: string | number): Promise<any> {
    return this.api.get(`/${this.ressource}/restaurant/${restaurantId}`).then((res: any) => res.data);
  }

  /**
   * Récupère les plats par type de repas
   * @param {string} restaurantId - ID du restaurant
   * @param {string} typeRepas - Type de repas (petit_dejeuner, dejeuner, diner)
   * @returns {Promise} Liste des plats filtrés
   */
  async byTypeRepas(restaurantId: string | number, typeRepas: string): Promise<any> {
    return this.api.get(`/${this.ressource}/restaurant/${restaurantId}/type/${typeRepas}`).then((res: any) => res.data);
  }

  async updateImage(platId: string | number, data: any): Promise<any> {
    return this.api.patch(`/${this.ressource}/updateimage/${platId}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((res: any) => res.data);
  }
}
