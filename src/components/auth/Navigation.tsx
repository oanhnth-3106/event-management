// =====================================================================
// Navigation Component
// =====================================================================
// Purpose: Main navigation bar with auth state
// Shows: Logo, links, user menu or auth buttons
// =====================================================================

import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { UserMenu } from "./UserMenu";
import type { Profile } from "@/types/database.types";

export async function Navigation() {
  const supabase = createServerClient();

  // Get current user and session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get profile if user is authenticated
  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      profile = data as Profile;
    }
  }

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">EventHub</span>
            </Link>

            {/* Main Navigation */}
            <div className="hidden space-x-6 md:flex">
              <Link
                href="/events"
                className="text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                Browse Events
              </Link>
              {user && profile && profile.role === "organizer" && (
                <Link
                  href="/organizer/create"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  Create Event
                </Link>
              )}
            </div>
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {user && profile && user.email ? (
              <UserMenu
                user={{ id: user.id, email: user.email }}
                profile={profile}
              />
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
