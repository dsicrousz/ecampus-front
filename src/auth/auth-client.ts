import { env } from "@/env"
import { createAuthClient } from "better-auth/react"
import { dashClient,sentinelClient } from "@better-auth/infra/client";

export const authClient = createAuthClient({
  baseURL: env.VITE_AUTH_API,
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [
    // ... other plugins
    dashClient(),
    sentinelClient()
  ]
})

// Infer types from the auth client and extend with custom fields
export type Session = typeof authClient.$Infer.Session & {
  user: typeof authClient.$Infer.Session.user & {
    role: string;
  };
}

export type User = Session['user']

// Export a typed version of useSession
export const useSession = () => {
  const session = authClient.useSession()
  return session as {
    data: Session | null;
    isPending: boolean;
    error: Error | null;
  }
}

export const getSession = async () => {
  const session = await authClient.getSession()
  return session as {
    data: Session | null;
    isPending: boolean;
    error: Error | null;
  }
}
