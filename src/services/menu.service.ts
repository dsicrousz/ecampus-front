import Api from "./Api";
import { Service } from "./Service";

export class MenuService extends Service {
  constructor() {
    super(Api, 'menus');
  }

  /**
   * Récupère tous les menus d'un restaurant spécifique
   * @param {string} restaurantId - ID du restaurant
   * @returns {Promise} Liste des menus du restaurant
   */
  async byRestaurant(restaurantId: string | number): Promise<any> {
    return this.api.get(`/${this.ressource}/restaurant/${restaurantId}`).then((res: any) => res.data);
  }

  /**
   * Récupère les menus par date
   * @param {string} restaurantId - ID du restaurant
   * @param {string} date - Date au format DD/MM/YYYY
   * @returns {Promise} Liste des menus filtrés
   */
  async byDate(restaurantId: string | number, date: string): Promise<any> {
    return this.api.get(`/${this.ressource}/day/${restaurantId}?date=${date}`).then((res: any) => res.data);
  }

  /**
   * Récupère un menu avec les détails complets des plats
   * @param {string} menuId - ID du menu
   * @returns {Promise} Menu avec plats populés
   */
  async getWithPlats(menuId: string | number): Promise<any> {
    return this.api.get(`/${this.ressource}/${menuId}/plats`).then((res: any) => res.data);
  }
}
