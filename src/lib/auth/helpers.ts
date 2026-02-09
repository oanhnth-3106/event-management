// =====================================================================
// Auth Helper Utilities
// =====================================================================
// Purpose: Reusable authentication utilities
// Functions: getCurrentUser, requireAuth, requireRole
// =====================================================================

import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile, UserRole } from '@/types/database.types';

/**
 * Get current authenticated user with profile
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<{
  user: { id: string; email: string };
  profile: Profile;
} | null> {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email!,
    },
    profile,
  };
}

/**
 * Require user to be authenticated
 * Redirects to login if not authenticated
 */
export async function requireAuth(returnUrl?: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    const loginUrl = returnUrl
      ? `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`
      : '/auth/login';
    redirect(loginUrl);
  }

  return currentUser;
}

/**
 * Require user to have specific role
 * Redirects to unauthorized page if role doesn't match
 */
export async function requireRole(
  allowedRoles: UserRole[],
  returnUrl?: string
): Promise<{
  user: { id: string; email: string };
  profile: Profile;
}> {
  const currentUser = await requireAuth(returnUrl);

  if (!allowedRoles.includes(currentUser.profile.role)) {
    redirect('/unauthorized');
  }

  return currentUser;
}

/**
 * Check if user is authenticated (without redirect)
 */
export async function isAuthenticated(): Promise<boolean> {
  const currentUser = await getCurrentUser();
  return currentUser !== null;
}

/**
 * Check if user has specific role (without redirect)
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const currentUser = await getCurrentUser();
  return currentUser?.profile.role === role;
}

/**
 * Check if user has any of the specified roles (without redirect)
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const currentUser = await getCurrentUser();
  return currentUser ? roles.includes(currentUser.profile.role) : false;
}
