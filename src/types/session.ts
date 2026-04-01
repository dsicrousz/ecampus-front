export type Session = {
  _id: string
  annee: string
  dateDebut: string
  dateFin: string
  description?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export type SessionStatus = 'active' | 'en_cours' | 'a_venir' | 'terminee'

export interface SessionFormValues {
  annee: string
  dateRange: [any, any]
  description?: string
}
