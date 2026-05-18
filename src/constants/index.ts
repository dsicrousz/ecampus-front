export const QUERY_KEYS = {
  SERVICES: "services",
  TICKETS: "tickets",
  DECADES: "decades",
  USERS: "users",
  MENUS: "menus",
  PLATS: "plats",
  OPERATIONS: "operations",
  OPERATIONS_BY_TICKET: "operations_by_ticket",
  OPERATIONS_BY_SERVICE: "operations_by_service",
  OPERATIONS_BY_USER: "operations_by_user",
  COMPTES: "comptes",
  SESSION_ACTIVE: "session_active",
} as const;

export const queryKeys = {
  serviceDetail: (serviceId: string) => [QUERY_KEYS.SERVICES, serviceId] as const,
  ticketDetail: (ticketId: string) => [QUERY_KEYS.TICKETS, ticketId] as const,
  compteByCode: (code: string) => [QUERY_KEYS.COMPTES, "code", code] as const,
  operationsByTicket: (ticketId: string) =>
    [QUERY_KEYS.OPERATIONS_BY_TICKET, ticketId] as const,
  hasConsumedToday: (compteId: string, ticketId: string) =>
    ["hasConsumedToday", compteId, ticketId] as const,
};
