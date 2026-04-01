export interface Ticket {
  _id: string
  nom: string
  description: string
  prix: number
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
  active: boolean
}
