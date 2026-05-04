import { z } from 'zod';

export const pubSchema = z.object({
  titre: z.string().min(1, 'Le titre est requis'),
  description: z.string().min(1, 'La description est requise'),
  debut: z.string().datetime('La date de début doit être une date valide'),
  fin: z.string().datetime('La date de fin doit être une date valide'),
  image: z.string().optional(),
});

export type CreatePubDto = z.infer<typeof pubSchema>;

export interface Pub {
  _id: string;
  titre: string;
  description: string;
  debut: string;
  fin: string;
  image?: string;
  isExpired?: boolean;
}
