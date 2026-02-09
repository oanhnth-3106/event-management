// =====================================================================
// My Tickets Page
// =====================================================================
// Purpose: Display all user's event registrations/tickets
// Route: /my/tickets
// =====================================================================

import { createServerClient, requireAuth } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getUserRegistrations(userId: string) {
  const supabase = createServerClient();

  const { data: registrations, error } = await supabase
    .from("registrations")
    .select(
      `
      *,
      event:events(
        id,
        title,
        slug,
        start_date,
        end_date,
        location,
        image_url,
        status
      ),
      ticket_type:ticket_types(
        id,
        name,
        price
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching registrations:", error);
    return [];
  }

  return registrations || [];
}

export default async function MyTicketsPage() {
  const user = await requireAuth();

  if (!user) {
    notFound();
  }

  const registrations = await getUserRegistrations(user.id);

  // Group registrations by status
  const upcoming = registrations.filter(
    (r) =>
      r.status === "confirmed" && new Date(r.event.start_date) > new Date(),
  );
  const past = registrations.filter(
    (r) =>
      r.status === "checked_in" || new Date(r.event.start_date) <= new Date(),
  );
  const cancelled = registrations.filter((r) => r.status === "cancelled");

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
          <p className="text-gray-600 mt-2">
            Manage your event registrations and tickets
          </p>
        </div>

        {/* No tickets */}
        {registrations.length === 0 && (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              No Tickets Yet
            </h2>
            <p className="mt-2 text-gray-600">
              You haven't registered for any events yet.
            </p>
            <Link
              href="/events"
              className="mt-6 inline-block rounded-md bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Browse Events
            </Link>
          </div>
        )}

        {/* Upcoming Tickets */}
        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Upcoming Events ({upcoming.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((registration) => (
                <TicketCard key={registration.id} registration={registration} />
              ))}
            </div>
          </div>
        )}

        {/* Past Tickets */}
        {past.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Past Events ({past.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {past.map((registration) => (
                <TicketCard
                  key={registration.id}
                  registration={registration}
                  isPast
                />
              ))}
            </div>
          </div>
        )}

        {/* Cancelled Tickets */}
        {cancelled.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Cancelled ({cancelled.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cancelled.map((registration) => (
                <TicketCard
                  key={registration.id}
                  registration={registration}
                  isCancelled
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TicketCard({
  registration,
  isPast = false,
  isCancelled = false,
}: {
  registration: any;
  isPast?: boolean;
  isCancelled?: boolean;
}) {
  const event = registration.event;
  const ticketType = registration.ticket_type;

  return (
    <Link
      href={`/my/registrations/${registration.id}`}
      className="group block rounded-lg bg-white shadow hover:shadow-lg transition-shadow overflow-hidden"
    >
      {/* Event Image */}
      <div className="relative h-48 overflow-hidden">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
            <svg
              className="h-16 w-16 text-white opacity-80"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          {isCancelled ? (
            <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
              Cancelled
            </span>
          ) : registration.status === "checked_in" ? (
            <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
              Attended
            </span>
          ) : isPast ? (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
              Past
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              Confirmed
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2">
          {event.title}
        </h3>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-400"
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

          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-400"
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
            <span className="line-clamp-1">{event.location}</span>
          </div>

          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-400"
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
              {ticketType.name}
            </span>
          </div>
        </div>

        {!isCancelled && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">Ticket Price</span>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(ticketType.price)}
            </span>
          </div>
        )}

        {!isCancelled && !isPast && (
          <div className="mt-4">
            <div className="rounded-md bg-blue-50 px-4 py-2 text-center text-sm font-medium text-blue-700">
              View QR Code →
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
