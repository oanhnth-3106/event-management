// =====================================================================
// Supabase Client - Server Component/API Route
// =====================================================================
// Purpose: Server-side Supabase client with user session (RLS enforced)
// Usage: Server Components, API Routes (when accessing user's own data)
// =====================================================================

import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Profile } from '@/types/database.types';
import { type SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for Server Components and API Routes
 * 
 * This client:
 * - Inherits the user's session from cookies
 * - Row-Level Security (RLS) is ENFORCED
 * - User can only access data allowed by RLS policies
 * - Use for read operations in Server Components
 * - Use for write operations that should respect user permissions
 * 
 * @example
 * // In a Server Component
 * const supabase = createServerClient();
 * const { data: events } = await supabase
 *   .from('events')
 *   .select('*')
 *   .eq('status', 'published');
 */
export function createServerClient(): SupabaseClient {
  const cookieStore = cookies();

  return createSupabaseServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client with service role (bypasses RLS)
 * 
 * WARNING: Only use for admin operations or when you need to bypass RLS
 * This client has full database access regardless of user session
 * 
 * @returns Supabase client with service role
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Get the current authenticated user from server context
 * 
 * @returns User object or null if not authenticated
 * 
 * @example
 * const user = await getCurrentUser();
 * if (!user) {
 *   redirect('/login');
 * }
 */
export async function getCurrentUser() {
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Get the current user's profile (including role)
 * 
 * @returns Profile object or null if not authenticated
 * 
 * @example
 * const profile = await getCurrentProfile();
 * if (profile?.role === 'organizer') {
 *   // Show organizer dashboard
 * }
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return null;
  }
  
  const { data: prof, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  const profile = prof as unknown as Profile | null;
  
  if (profileError || !profile) {
    return null;
  }
  
  return profile;
}

/**
 * Require authentication for a server component/route
 * Redirects to login if not authenticated
 * 
 * @throws Redirects to /login if not authenticated
 * @returns User object (guaranteed to exist)
 * 
 * @example
 * // In a protected page
 * const user = await requireAuth();
 * // User is guaranteed to be authenticated here
 */
export async function requireAuth() {
  const { redirect } = await import('next/navigation');
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  return user;
}

/**
 * Require specific role for a server component/route
 * Redirects to appropriate page if role doesn't match
 * 
 * @param allowedRoles - Array of roles that are allowed
 * @throws Redirects if user doesn't have required role
 * @returns Profile object (guaranteed to have required role)
 * 
 * @example
 * // Organizer-only page
 * const profile = await requireRole(['organizer', 'admin']);
 * // User is guaranteed to be organizer or admin here
 */
export async function requireRole(allowedRoles: Array<'attendee' | 'organizer' | 'staff' | 'admin'>) {
  const { redirect } = await import('next/navigation');
  const profile = await getCurrentProfile();
  
  if (!profile) {
    redirect('/auth/login');
  }
  
  if (profile && !allowedRoles.includes(profile.role)) {
    redirect('/unauthorized');
  }
  
  return profile;
}
