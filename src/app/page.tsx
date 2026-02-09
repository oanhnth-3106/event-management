// =====================================================================
// Home Page
// =====================================================================
// Purpose: Main landing page with upcoming events
// Route: /
// =====================================================================

import { EventList } from "@/components/events/EventList";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

// Force dynamic rendering to always check auth state
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Discover Amazing Events
            </h1>
            <p className="mt-6 text-xl text-blue-100">
              Find and register for events near you. Easy registration with QR
              code tickets.
            </p>
            <div className="mt-10 flex gap-4">
              <Link
                href="/events"
                className="rounded-md bg-white px-8 py-3 text-base font-semibold text-blue-600 shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
              >
                Browse Events
              </Link>
              {user && (
                <Link
                  href="/organizer/events"
                  className="rounded-md border-2 border-white px-8 py-3 text-base font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
                >
                  Manage Events
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Easy Registration
            </h3>
            <p className="text-gray-600">
              Register for events in seconds with our streamlined process.
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              QR Code Tickets
            </h3>
            <p className="text-gray-600">
              Receive secure QR code tickets instantly after registration.
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Quick Check-in
            </h3>
            <p className="text-gray-600">
              Fast check-in at events with QR code scanning.
            </p>
          </div>
        </div>
      </div>

      {/* Ongoing Events Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Happening Now</h2>
            <p className="mt-2 text-gray-600">Events currently taking place</p>
          </div>
          <Link
            href="/events?status=ongoing"
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            View All →
          </Link>
        </div>

        <EventList status="ongoing" limit={3} />
      </div>

      {/* Upcoming Events Section */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-16">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Upcoming Events
              </h2>
              <p className="mt-2 text-gray-600">
                Don't miss out on these future events
              </p>
            </div>
            <Link
              href="/events?status=upcoming"
              className="font-semibold text-blue-600 hover:text-blue-700"
            >
              View All →
            </Link>
          </div>

          <EventList status="upcoming" limit={6} />
        </div>
      </div>
    </div>
  );
}
