import { getSession, type Session } from '@/auth/auth-client';
import { redirect } from '@tanstack/react-router';
import { USER_ROLE } from '@/types/user.roles';

/**
 * Retourne la route d'accueil pour un rôle donné.
 * Les rôles non listés retournent '/admin/unauthorized'.
 */
export function getRoleHomeRoute(role: string | undefined): string {
  switch (role) {
    case USER_ROLE.SUPERADMIN:
    case USER_ROLE.ADMIN:
      return '/admin';
    case USER_ROLE.VENDEUR:
      return '/admin/recharge';
    case USER_ROLE.CAISSIER:
      return '/admin/caisse-principale';
    case USER_ROLE.ACP:
      return '/admin/agent-comptable';
    case USER_ROLE.CONTROLEUR:
    case USER_ROLE.CHEF_DIV_RESTAURANT:
      return '/admin/controleurs';
    case USER_ROLE.RECOUVREUR:
      return '/admin/recouvrement';
    case USER_ROLE.REPREUNEUR:
      return '/admin/repreuneurs';
    case USER_ROLE.SUPERVISEUR:
      return '/admin/superviseur';
    default:
      return '/admin/unauthorized';
  }
}

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
 * @throws redirect vers la page d'accueil du rôle si l'utilisateur n'a pas le rôle requis
 */
export async function requireRole(requiredRoles: string[]) {
  const session = await getSession();
  const userRole = (session.data as Session)?.user?.role;

  if (!hasRequiredRole(userRole, requiredRoles)) {
    throw redirect({ to: getRoleHomeRoute(userRole) });
  }
}

/**
 * Vérifie si l'utilisateur peut modifier/supprimer des données.
 * ADMIN a accès en lecture seule, seul SUPERADMIN peut modifier.
 */
export function canModify(userRole: string | undefined): boolean {
  return userRole === USER_ROLE.SUPERADMIN;
}
