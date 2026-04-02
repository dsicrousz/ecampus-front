import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SERVER_URL: z.string().url().optional(),
  },

  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: 'VITE_',

  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
    VITE_APP_BACKEND: z.string(),
    VITE_AUTH_API: z.string().optional(),
    VITE_APP_BACKURL_ETUDIANT: z.string().optional(),
    VITE_APP_TOKENSTORAGENAME: z.string(),
  },

  runtimeEnv: {
    VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
    VITE_APP_BACKEND: import.meta.env.VITE_APP_BACKEND,
    VITE_AUTH_API: import.meta.env.VITE_AUTH_API,
    VITE_APP_BACKURL_ETUDIANT: import.meta.env.VITE_APP_BACKURL_ETUDIANT,
    VITE_APP_TOKENSTORAGENAME: import.meta.env.VITE_APP_TOKENSTORAGENAME,
  },

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in an ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,
})
