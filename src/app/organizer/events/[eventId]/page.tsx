// =====================================================================
// Organizer: Event Details Page
// =====================================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import EventActions from "@/components/organizer/EventActions";
import TicketTypesSection from "@/components/organizer/TicketTypesSection";

interface EventDetailsPageProps {
  params: {
    eventId: string;
  };
}

export default async function EventDetailsPage({
  params,
}: EventDetailsPageProps) {
  const supabase = createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch event details with ticket types
  const { data: event, error } = await supabase
    .from("events")
    .select(
      `
      *,
      ticket_types(*),
      organizer:profiles!events_organizer_id_fkey(
        full_name,
        email
      )
    `,
    )
    .eq("id", params.eventId)
    .eq("organizer_id", user.id)
    .single();

  if (error || !event) {
    redirect("/organizer/events");
  }

  // Calculate statistics
  const totalCapacity =
    event.ticket_types?.reduce(
      (sum: number, tt: any) => sum + tt.quantity,
      0,
    ) || 0;

  const availableTickets =
    event.ticket_types?.reduce(
      (sum: number, tt: any) => sum + tt.available,
      0,
    ) || 0;

  const soldTickets = totalCapacity - availableTickets;
  const soldPercentage =
    totalCapacity > 0 ? (soldTickets / totalCapacity) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link
            href="/organizer/events"
            className="mb-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to My Events
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                event.status === "published"
                  ? "bg-green-100 text-green-800"
                  : event.status === "cancelled"
                    ? "bg-red-100 text-red-800"
                    : event.status === "completed"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </span>
            <span className="text-sm text-gray-500">
              Created {new Date(event.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/organizer/events/${params.eventId}/edit`}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Edit Event
          </Link>
          <EventActions eventId={params.eventId} status={event.status} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details Card */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Event Details
            </h2>

            <div className="mb-6 h-64 w-full rounded-lg overflow-hidden">
              {event.image_url ? (
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center">
                  <svg
                    className="h-32 w-32 text-white opacity-80 mb-4"
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
                  <p className="text-lg font-semibold text-white px-6 text-center">
                    {event.title}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700">
                  Description
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-gray-900">
                  {event.description}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    Start Date & Time
                  </h3>
                  <p className="mt-1 text-gray-900">
                    {new Date(event.start_date).toLocaleString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    End Date & Time
                  </h3>
                  <p className="mt-1 text-gray-900">
                    {new Date(event.end_date).toLocaleString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    Location
                  </h3>
                  <p className="mt-1 text-gray-900">{event.location}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">
                    Total Capacity
                  </h3>
                  <p className="mt-1 text-gray-900">
                    {event.capacity} attendees
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Types */}
          <TicketTypesSection
            eventId={params.eventId}
            ticketTypes={event.ticket_types || []}
          />
        </div>

        {/* Sidebar - Statistics */}
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Statistics
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tickets Sold</span>
                  <span className="font-semibold text-gray-900">
                    {soldTickets} / {totalCapacity}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${soldPercentage}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {soldPercentage.toFixed(1)}% capacity
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {soldTickets}
                  </p>
                  <p className="text-sm text-gray-600">Registered</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">0</p>
                  <p className="text-sm text-gray-600">Checked In</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Quick Actions
            </h2>

            <div className="space-y-2">
              <Link
                href={`/organizer/events/${params.eventId}/attendees`}
                className="block rounded-md border border-gray-300 px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
              >
                View Attendees
              </Link>
              <Link
                href={`/organizer/events/${params.eventId}/analytics`}
                className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-sm text-gray-700 hover:bg-gray-50"
              >
                Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
