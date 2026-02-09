// =====================================================================
// Event Detail Page
// =====================================================================
// Purpose: Display event details and registration
// Route: /events/[slug]
// =====================================================================

import { notFound } from "next/navigation";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { createServerClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/events/BackButton";

// Fetch event data from Supabase
async function getEvent(slug: string) {
  const supabase = createServerClient();

  // Check if slug is a UUID
  const isUUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slug,
    );

  // Try to find event by slug or id
  let query = supabase.from("events").select(
    `
      *,
      organizer:profiles!events_organizer_id_fkey(
        full_name,
        email
      ),
      ticket_types(*)
    `,
  );

  // If it's a UUID, search by id, otherwise search by slug
  if (isUUID) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: event, error } = await query.single();

  if (error || !event) {
    console.error("Error fetching event:", error);
    return null;
  }

  // Get registration count
  const { count: registrationCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .neq("status", "cancelled");

  // Calculate available tickets
  const totalCapacity =
    event.ticket_types?.reduce(
      (sum: number, tt: any) => sum + (tt.quantity || 0),
      0,
    ) || 0;
  const availableTickets =
    event.ticket_types?.reduce(
      (sum: number, tt: any) => sum + (tt.available || 0),
      0,
    ) || 0;

  return {
    ...event,
    organizer: {
      fullName: event.organizer?.full_name || "Unknown",
      email: event.organizer?.email,
    },
    stats: {
      totalTickets: totalCapacity,
      availableTickets,
      registeredCount: registrationCount || 0,
    },
    // Map fields to match expected format
    imageUrl: event.image_url,
    startDate: event.start_date,
    endDate: event.end_date,
    ticketTypes: event.ticket_types || [],
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const event = await getEvent(params.slug);

  if (!event) {
    notFound();
  }

  const isUpcoming = new Date(event.startDate) > new Date();
  const isSoldOut = event.stats.availableTickets === 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Event Image */}
            <div className="mb-8 aspect-video overflow-hidden rounded-lg">
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-32 w-32 text-white opacity-90"
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
                    <p className="mt-4 text-2xl font-bold text-white opacity-90">
                      {event.title}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Event Info */}
            <div className="rounded-lg bg-white p-8 shadow-sm">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                  {event.title}
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  Organized by {event.organizer.fullName}
                </p>
              </div>

              {/* Event Details */}
              <div className="mb-8 space-y-4">
                <div className="flex items-start">
                  <svg
                    className="mr-3 mt-1 h-5 w-5 text-gray-400"
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
                  <div>
                    <p className="font-semibold text-gray-900">Date & Time</p>
                    <p className="text-gray-600">
                      {formatDateTime(event.startDate)}
                    </p>
                    {event.endDate && (
                      <p className="text-gray-600">
                        to {formatDateTime(event.endDate)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <svg
                    className="mr-3 mt-1 h-5 w-5 text-gray-400"
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
                  <div>
                    <p className="font-semibold text-gray-900">Location</p>
                    <p className="text-gray-600">{event.location}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <svg
                    className="mr-3 mt-1 h-5 w-5 text-gray-400"
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
                  <div>
                    <p className="font-semibold text-gray-900">Capacity</p>
                    <p className="text-gray-600">
                      {event.stats.registeredCount} / {event.capacity}{" "}
                      registered
                    </p>
                    <p className="text-sm text-gray-500">
                      {event.stats.availableTickets} tickets available
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <svg
                    className="mr-3 mt-1 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">Status</p>
                    <p className="text-gray-600">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          event.status === "published"
                            ? "bg-green-100 text-green-800"
                            : event.status === "draft"
                              ? "bg-yellow-100 text-yellow-800"
                              : event.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {event.status.charAt(0).toUpperCase() +
                          event.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="mb-4 text-2xl font-bold text-gray-900">
                  About This Event
                </h2>
                <div className="prose max-w-none text-gray-600">
                  {event.description}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Registration */}
          <div>
            <div className="sticky top-8">
              <div className="rounded-lg bg-white p-6 shadow-lg">
                <h2 className="mb-4 text-xl font-bold text-gray-900">
                  {isSoldOut ? "Sold Out" : "Register Now"}
                </h2>

                {isUpcoming && !isSoldOut ? (
                  <RegistrationForm
                    eventId={event.id}
                    eventTitle={event.title}
                    ticketTypes={event.ticketTypes}
                  />
                ) : isSoldOut ? (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
                    <p className="font-semibold">Event Sold Out</p>
                    <p className="text-sm">All tickets have been claimed.</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-600">
                    <p className="font-semibold">Registration Closed</p>
                    <p className="text-sm">This event has already started.</p>
                  </div>
                )}

                {/* Ticket Types Info */}
                {!isSoldOut && event.ticketTypes.length > 0 && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">
                      Ticket Information
                    </h3>
                    <div className="space-y-2">
                      {event.ticketTypes.map((tt: any) => (
                        <div
                          key={tt.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-600">{tt.name}</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(tt.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Back Button */}
        <BackButton />
      </div>
    </div>
  );
}
