// =====================================================================
// Event List Component
// =====================================================================
// Purpose: Display list of published events with filtering
// Used in: Home page, Browse events page
// =====================================================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate, formatCurrency, isUpcoming } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type Event = Database["public"]["Tables"]["events"]["Row"] & {
  organizer: {
    full_name: string;
    email: string;
  };
  ticket_types: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    available: number;
  }>;
};

interface EventListProps {
  initialEvents?: Event[];
  status?: "published" | "upcoming" | "ongoing" | "past";
  searchQuery?: string;
  limit?: number;
}

export function EventList({
  initialEvents = [],
  status = "upcoming",
  searchQuery = "",
  limit = 10,
}: EventListProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          status,
          page: page.toString(),
          limit: limit.toString(),
          ...(searchQuery && { search: searchQuery }),
        });

        const response = await fetch(`/api/events?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch events");
        }

        if (page === 1) {
          setEvents(data.data);
        } else {
          setEvents((prev) => [...prev, ...data.data]);
        }

        setHasMore(data.pagination.page < data.pagination.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [status, searchQuery, page, limit]);

  // Load more events
  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-semibold">Error loading events</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (events.length === 0 && !loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-600">No events found</p>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-500">
            Try adjusting your search query
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        </div>
      )}

      {/* Load More Button */}
      {!loading && hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

// Event Card Component
function EventCard({ event }: { event: Event }) {
  const minPrice = Math.min(...event.ticket_types.map((tt) => tt.price));
  const totalTickets = event.ticket_types.reduce(
    (sum, tt) => sum + tt.quantity,
    0,
  );
  const availableTickets = event.ticket_types.reduce(
    (sum, tt) => sum + tt.available,
    0,
  );
  const soldOut = availableTickets === 0;

  return (
    <Link href={`/events/${event.slug || event.id}`}>
      <div className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
        {/* Event Image */}
        <div className="relative aspect-video bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
              <div className="text-center">
                <svg
                  className="mx-auto h-20 w-20 text-white opacity-80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="mt-2 text-sm font-medium text-white opacity-80">
                  {event.title.substring(0, 30)}
                  {event.title.length > 30 ? '...' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Sold Out Badge */}
          {soldOut && (
            <div className="absolute right-2 top-2 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
              Sold Out
            </div>
          )}
        </div>

        {/* Event Info */}
        <div className="p-4">
          <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600">
            {event.title}
          </h3>

          <p className="mb-3 line-clamp-2 text-sm text-gray-600">
            {event.description}
          </p>

          {/* Event Details */}
          <div className="space-y-2 text-sm text-gray-500">
            {/* Date */}
            <div className="flex items-center">
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
              <span>{formatDate(event.start_date)}</span>
            </div>

            {/* Location */}
            <div className="flex items-center">
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
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="truncate">{event.location}</span>
            </div>

            {/* Price */}
            <div className="flex items-center">
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
              <span className="font-semibold text-gray-900">
                {formatCurrency(minPrice)}
              </span>
            </div>

            {/* Availability */}
            {!soldOut && (
              <div className="flex items-center">
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span>
                  {availableTickets} / {totalTickets} tickets available
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
