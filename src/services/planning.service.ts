import Api from "./Api";
import { Service } from "./Service";
import type {
  Planning,
  CreatePlanningDto,
  UpdatePlanningDto,
} from "@/types/planning";

export class PlanningService extends Service<Planning> {
  constructor() {
    super(Api, "planning");
  }

  /**
   * Récupère tous les plannings.
   * GET /planning
   */
  async findAll(): Promise<Planning[]> {
    return this.api.get(`/${this.ressource}`).then((res: any) => res.data);
  }

  /**
   * Récupère les plannings d'un restaurant (service populé).
   * GET /planning/restaurant/:restaurantId
   */
  async findByRestaurant(restaurantId: string): Promise<Planning[]> {
    return this.api
      .get(`/${this.ressource}/restaurant/${restaurantId}`)
      .then((res: any) => res.data);
  }

  /**
   * Récupère les plannings d'un service (restaurant populé).
   * GET /planning/service/:serviceId
   */
  async findByService(serviceId: string): Promise<Planning[]> {
    return this.api
      .get(`/${this.ressource}/service/${serviceId}`)
      .then((res: any) => res.data);
  }

  /**
   * Récupère le planning spécifique d'un restaurant pour un service.
   * GET /planning/restaurant/:restaurantId/service/:serviceId
   */
  async findByRestaurantAndService(
    restaurantId: string,
    serviceId: string
  ): Promise<Planning | null> {
    return this.api
      .get(`/${this.ressource}/restaurant/${restaurantId}/service/${serviceId}`)
      .then((res: any) => res.data);
  }

  /**
   * Récupère les plannings où l'agent est planifié aujourd'hui
   * (restaurant + service populés, filtre automatique jour + horaire en cours).
   * GET /planning/by-agent/:agentId
   */
  async findByAgentControle(agentId: string): Promise<Planning[]> {
    return this.api
      .get(`/${this.ressource}/by-agent/${agentId}`)
      .then((res: any) => res.data);
  }

  /**
   * Crée un planning (vérifie unicité restaurant+service).
   * POST /planning
   */
  async create(data: CreatePlanningDto): Promise<Planning> {
    return this.api.post(`/${this.ressource}`, data).then((res: any) => res.data);
  }

  /**
   * Met à jour un planning.
   * PATCH /planning/:id
   */
  async update(id: string, data: UpdatePlanningDto): Promise<Planning> {
    return this.api.patch(`/${this.ressource}/${id}`, data).then((res: any) => res.data);
  }
}
