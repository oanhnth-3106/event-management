// =====================================================================
// Registration Detail Page (QR Ticket)
// =====================================================================
// Purpose: Display full QR code ticket for single registration
// Route: /my/registrations/[id]
// Authentication: Required
// =====================================================================

import { requireAuth } from "@/lib/auth/helpers";
import { createServerClient } from "@/lib/supabase/server";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { QRCodeDisplay } from "@/components/qr/QRCodeDisplay";

export default async function RegistrationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { user, profile } = await requireAuth();

  const supabase = createServerClient();

  // Fetch registration
  const { data: registration } = await supabase
    .from("registrations")
    .select(
      `
      *,
      event:events(*),
      ticket_type:ticket_types(*)
    `,
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!registration) {
    notFound();
  }

  const isCancelled = registration.status === "cancelled";
  const isCheckedIn = registration.status === "checked_in";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/my/registrations"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to My Tickets
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* QR Code Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {!isCancelled ? (
                <QRCodeDisplay
                  qrData={registration.qr_data}
                  attendeeName={profile.full_name}
                  eventTitle={registration.event.title}
                  ticketType={registration.ticket_type.name}
                  size={300}
                />
              ) : (
                <div className="rounded-lg bg-white p-8 text-center shadow-lg">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                    <svg
                      className="h-8 w-8 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Ticket Cancelled
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    This registration has been cancelled
                  </p>
                </div>
              )}

              {isCheckedIn && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center">
                    <svg
                      className="mr-2 h-5 w-5 text-green-600"
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
                    <span className="text-sm font-semibold text-green-900">
                      Checked In
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-green-800">
                    You've successfully checked in to this event
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Event Details Section */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-8 shadow-sm">
              <h1 className="text-3xl font-bold text-gray-900">
                {registration.event.title}
              </h1>

              {/* Event Info */}
              <div className="mt-6 space-y-4">
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
                      {formatDateTime(registration.event.start_date)}
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">Location</p>
                    <p className="text-gray-600">
                      {registration.event.location}
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
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-900">Ticket Type</p>
                    <p className="text-gray-600">
                      {registration.ticket_type.name} -{" "}
                      {formatCurrency(registration.ticket_type.price)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-8 border-t border-gray-200 pt-8">
                <h2 className="text-xl font-semibold text-gray-900">
                  About This Event
                </h2>
                <p className="mt-4 text-gray-600">
                  {registration.event.description}
                </p>
              </div>

              {/* Actions */}
              {!isCancelled && !isCheckedIn && (
                <div className="mt-8 flex space-x-4 border-t border-gray-200 pt-8">
                  <Link
                    href={`/events/${registration.event.slug}`}
                    className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    View Event Details
                  </Link>
                  <button className="rounded-md border border-red-300 px-6 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                    Cancel Registration
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
