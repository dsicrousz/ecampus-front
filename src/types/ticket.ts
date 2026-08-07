export enum TicketType {
  RESTAURATION = 'restauration',
  AUTRE = 'autre',
}

export interface Ticket {
  _id: string
  nom: string
  description: string
  prix: number
  type?: TicketType
  active: boolean
  createdAt?: string
  updatedAt?: string
  __v?: number
}

export interface TicketFormValues {
  _id?: string
  nom: string
  description: string
  prix: number
  type?: TicketType
  active: boolean
}
