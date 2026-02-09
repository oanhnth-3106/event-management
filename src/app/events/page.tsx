// =====================================================================
// Events Browse Page
// =====================================================================
// Purpose: Browse and search all published events
// Route: /events
// =====================================================================

import { EventList } from "@/components/events/EventList";
import { Suspense } from "react";

interface SearchParams {
  search?: string;
  status?: "upcoming" | "ongoing" | "past";
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { search, status } = searchParams;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Browse Events</h1>
          <p className="mt-2 text-gray-600">
            Discover and register for upcoming events
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <form method="get" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Search Input */}
              <div>
                <label
                  htmlFor="search"
                  className="block text-sm font-medium text-gray-700"
                >
                  Search Events
                </label>
                <input
                  type="text"
                  id="search"
                  name="search"
                  defaultValue={search}
                  placeholder="Search by title or description..."
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={status || "upcoming"}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="upcoming">Upcoming Events</option>
                  <option value="ongoing">Ongoing Events</option>
                  <option value="past">Past Events</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </form>
        </div>

        {/* Event List */}
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            </div>
          }
        >
          <EventList status={status} searchQuery={search} limit={12} />
        </Suspense>
      </div>
    </div>
  );
}
