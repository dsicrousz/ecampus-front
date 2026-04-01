import { Service } from "./Service";
import Api from "./Api";
/**
 * Service pour gérer les sessions académiques
 */
export class SessionService extends Service {
    constructor() {
        super(Api, 'session');
    }

    /**
     * Récupère la session active
     * @returns {Promise<Object>}
     */
    async getActive(): Promise<any> {
        return this.api.get(`/${this.ressource}/active`).then((res: any) => res.data);
    }

    /**
     * Active une session (désactive automatiquement les autres)
     * @param {string} id - ID de la session à activer
     * @returns {Promise<Object>}
     */
    async activate(id: string | number): Promise<any> {
        return this.api.patch(`/${this.ressource}/${id}/activate`).then((res: any) => res.data);
    }

    /**
     * Récupère les sessions par année
     * @param {string} annee - Année de la session
     * @returns {Promise<Array>}
     */
    async byAnnee(annee: string): Promise<any> {
        return this.api.get(`/${this.ressource}/annee/${annee}`).then((res: any) => res.data);
    }

    /**
     * Récupère les sessions en cours
     * @returns {Promise<Array>}
     */
    async getEnCours(): Promise<any> {
        return this.api.get(`/${this.ressource}/en-cours`).then((res: any) => res.data);
    }

    /**
     * Récupère les sessions à venir
     * @returns {Promise<Array>}
     */
    async getAVenir(): Promise<any> {
        return this.api.get(`/${this.ressource}/a-venir`).then((res: any) => res.data);
    }

    /**
     * Récupère les sessions terminées
     * @returns {Promise<Array>}
     */
    async getTerminees(): Promise<any> {
        return this.api.get(`/${this.ressource}/terminees`).then((res: any) => res.data);
    }

    /**
     * Vérifie si une année existe déjà
     * @param {string} annee - Année à vérifier
     * @returns {Promise<boolean>}
     */
    async checkAnneeExists(annee: string): Promise<boolean> {
        return this.api.get(`/${this.ressource}/check-annee/${annee}`)
            .then((res: any) => res.data.exists)
            .catch(() => false);
    }
}
