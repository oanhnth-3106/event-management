// =====================================================================
// Organizer Events Page
// =====================================================================
// Purpose: View and manage events created by organizer
// Route: /organizer/events
// Authentication: Required (organizer or admin)
// =====================================================================

import { requireRole } from "@/lib/auth/helpers";
import { createServerClient } from "@/lib/supabase/server";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function OrganizerEventsPage() {
  const { user, profile } = await requireRole(["organizer", "admin"]);

  const supabase = createServerClient();

  // Fetch organizer's events
  const { data: events } = await supabase
    .from("events")
    .select(
      `
      *,
      ticket_types(count),
      registrations(count)
    `,
    )
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false });

  // Group by status
  const drafts = events?.filter((e) => e.status === "draft") || [];
  const published = events?.filter((e) => e.status === "published") || [];
  const cancelled = events?.filter((e) => e.status === "cancelled") || [];
  const completed = events?.filter((e) => e.status === "completed") || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Events</h1>
            <p className="mt-2 text-gray-600">
              Manage your events and registrations
            </p>
          </div>
          <Link
            href="/organizer/create"
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create New Event
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-600">Total Events</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {events?.length || 0}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-600">Published</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {published.length}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-600">Drafts</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {drafts.length}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {completed.length}
            </p>
          </div>
        </div>

        {/* Empty State */}
        {events?.length === 0 && (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No events yet
            </h3>
            <p className="mt-2 text-gray-600">
              Get started by creating your first event
            </p>
            <Link
              href="/organizer/create"
              className="mt-6 inline-block rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create Event
            </Link>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-6">
          {events?.map((event: any) => (
            <div
              key={event.id}
              className="overflow-hidden rounded-lg bg-white shadow-sm"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <Link
                        href={`/organizer/events/${event.id}`}
                        className="group"
                      >
                        <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                          {event.title}
                        </h3>
                      </Link>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          event.status === "published"
                            ? "bg-green-100 text-green-800"
                            : event.status === "draft"
                              ? "bg-yellow-100 text-yellow-800"
                              : event.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="mr-2 h-4 w-4"
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
                        {formatDate(event.start_date)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        {event.registrations?.[0]?.count || 0} /{" "}
                        {event.capacity} registered
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="mr-2 h-4 w-4"
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
                        {event.ticket_types?.[0]?.count || 0} ticket types
                      </div>
                    </div>
                  </div>

                  <div className="ml-6 flex flex-col space-y-2">
                    <Link
                      href={`/organizer/events/${event.id}`}
                      className="rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Manage
                    </Link>
                    {event.status === "published" && (
                      <Link
                        href={`/events/${event.slug || event.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        View Public
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
