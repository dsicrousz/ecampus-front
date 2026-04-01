import type { Etudiant } from "./etudiant"

export interface Compte {
  _id: string
  code: string
  solde: number
  is_actif: boolean
  est_perdu: boolean
  etudiant?: Etudiant
}