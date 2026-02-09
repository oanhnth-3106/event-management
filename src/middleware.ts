// =====================================================================
// Supabase Middleware - Session Management
// =====================================================================
// Purpose: Refresh user sessions and handle authentication redirects
// Usage: Next.js middleware (runs on every request)
// =====================================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database.types';

/**
 * Protected route patterns
 * These routes require authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/organizer',
  '/staff',
  '/profile',
  '/my',
];

/**
 * Public route patterns
 * These routes are accessible without authentication
 */
const PUBLIC_ROUTES = [
  '/',
  '/events',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
];

/**
 * Role-specific route patterns
 * Map routes to required roles
 */
const ROLE_ROUTES: Record<string, Array<'attendee' | 'organizer' | 'staff' | 'admin'>> = {
  '/organizer': ['organizer', 'admin'],
  '/staff': ['staff', 'organizer', 'admin'],
};

/**
 * Middleware function to handle authentication and session refresh
 * 
 * Responsibilities:
 * 1. Refresh user session on every request
 * 2. Redirect unauthenticated users from protected routes
 * 3. Enforce role-based access to specific routes
 * 4. Set cookies for session management
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Use getUser() instead of getSession() for security
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route));

  console.log('[Middleware] Session check:', { 
    pathname,
    hasUser: !!user,
    userId: user?.id,
    isProtectedRoute,
    matchedRoleRoute: Object.keys(ROLE_ROUTES).find(route => pathname.startsWith(route))
  });

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Check role-based access
  if (user && isProtectedRoute) {
    for (const [route, requiredRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route)) {
        // Try to get role from user metadata first (if set during signup)
        let userRole = user.user_metadata?.role as 'attendee' | 'organizer' | 'staff' | 'admin' | undefined;
        
        // If not in metadata, query profiles table
        if (!userRole) {
          const { data: prof, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          const profile = prof as unknown as { role: 'attendee' | 'organizer' | 'staff' | 'admin' } | null;
          userRole = profile?.role;
        }

        if (!userRole || !requiredRoles.includes(userRole)) {
          // Redirect to unauthorized page or dashboard
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = '/unauthorized';
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

/**
 * Middleware configuration
 * Specifies which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
