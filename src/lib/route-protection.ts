import { getSession, type Session } from '@/auth/auth-client';
import { redirect } from '@tanstack/react-router';
import { USER_ROLE } from '@/types/user.roles';

/**
 * Vérifie si l'utilisateur a le rôle requis
 * @param userRole - Le rôle de l'utilisateur
 * @param requiredRoles - Les rôles requis pour accéder à la route
 * @returns true si l'utilisateur a accès, false sinon
 */
export function hasRequiredRole(userRole: string | undefined, requiredRoles: string[]): boolean {
  if (!userRole) return false;
  // Les SUPERADMIN ont accès à tout
  if (userRole === USER_ROLE.SUPERADMIN) return true;
  return requiredRoles.includes(userRole);
}

/**
 * Fonction de protection de route basée sur les rôles
 * @param requiredRoles - Les rôles requis pour accéder à la route
 * @throws redirect vers /admin si l'utilisateur n'a pas le rôle requis
 */
export async function requireRole(requiredRoles: string[]) {
  const session = await getSession();
  const userRole = (session.data as Session)?.user?.role;

  if (!hasRequiredRole(userRole, requiredRoles)) {
    throw redirect({ to: '/admin' });
  }
}
