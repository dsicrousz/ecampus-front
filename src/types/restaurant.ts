import type { Service } from './service';

export interface RestaurantServiceEntry {
  service: Service | string;
  prixRepreneur: number;
}

export interface Restaurant {
  _id: string;
  nom: string;
  superviseur: string;
  repreneur: string;
  localisation?: string;
  description?: string;
  nombrePlaces?: number;
  active: boolean;
  services?: RestaurantServiceEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RestaurantFormValues {
  _id?: string;
  nom: string;
  superviseur: string;
  repreneur: string;
  localisation?: string;
  description?: string;
  nombrePlaces?: number;
  active: boolean;
  services?: RestaurantServiceEntry[];
}
