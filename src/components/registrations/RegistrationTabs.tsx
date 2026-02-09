"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { QRCodeDisplay } from "@/components/qr/QRCodeDisplay";

type TabType = "upcoming" | "attended" | "cancelled";

interface Registration {
  id: string;
  status: string;
  qr_data: any;
  event: {
    slug: string;
    title: string;
    start_date: string;
    location: string;
  };
  ticket_type: {
    name: string;
    price: number;
  };
}

interface RegistrationTabsProps {
  confirmed: Registration[];
  checkedIn: Registration[];
  cancelled: Registration[];
  userFullName: string;
}

export function RegistrationTabs({
  confirmed,
  checkedIn,
  cancelled,
  userFullName,
}: RegistrationTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");

  const getActiveRegistrations = () => {
    switch (activeTab) {
      case "upcoming":
        return confirmed;
      case "attended":
        return checkedIn;
      case "cancelled":
        return cancelled;
      default:
        return [];
    }
  };

  const activeRegistrations = getActiveRegistrations();

  return (
    <>
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "upcoming"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Upcoming ({confirmed.length})
          </button>
          <button
            onClick={() => setActiveTab("attended")}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "attended"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Attended ({checkedIn.length})
          </button>
          <button
            onClick={() => setActiveTab("cancelled")}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "cancelled"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Cancelled ({cancelled.length})
          </button>
        </nav>
      </div>

      {/* Empty State */}
      {activeRegistrations.length === 0 && (
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
              d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {activeTab === "upcoming" && "No upcoming tickets"}
            {activeTab === "attended" && "No attended events yet"}
            {activeTab === "cancelled" && "No cancelled registrations"}
          </h3>
          <p className="mt-2 text-gray-600">
            {activeTab === "upcoming" &&
              "Start by browsing and registering for events"}
            {activeTab === "attended" &&
              "Events you've checked in to will appear here"}
            {activeTab === "cancelled" &&
              "Cancelled registrations will appear here"}
          </p>
          {activeTab === "upcoming" && (
            <Link
              href="/events"
              className="mt-6 inline-block rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Browse Events
            </Link>
          )}
        </div>
      )}

      {/* Registrations List */}
      <div className="space-y-6">
        {activeRegistrations.map((registration) => (
          <div
            key={registration.id}
            className="overflow-hidden rounded-lg bg-white shadow-sm"
          >
            <div className="grid gap-6 p-6 lg:grid-cols-3">
              {/* Event Info */}
              <div className="lg:col-span-2">
                <Link
                  href={`/events/${registration.event.slug}`}
                  className="group"
                >
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                    {registration.event.title}
                  </h3>
                </Link>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
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
                    {formatDateTime(registration.event.start_date)}
                  </div>
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
                    </svg>
                    {registration.event.location}
                  </div>
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
                    {registration.ticket_type.name} -{" "}
                    {formatCurrency(registration.ticket_type.price)}
                  </div>

                  {/* Status Badge */}
                  {activeTab === "attended" && (
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                        ✓ Checked In
                      </span>
                    </div>
                  )}
                  {activeTab === "cancelled" && (
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                        Cancelled
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex space-x-3">
                  {activeTab === "upcoming" && (
                    <>
                      <Link
                        href={`/my/registrations/${registration.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View QR Code →
                      </Link>
                      <button className="text-sm font-medium text-red-600 hover:text-red-700">
                        Cancel Registration
                      </button>
                    </>
                  )}
                  {activeTab === "attended" && (
                    <Link
                      href={`/events/${registration.event.slug}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View Event →
                    </Link>
                  )}
                </div>
              </div>

              {/* QR Code Preview - Only show for upcoming */}
              {activeTab === "upcoming" && (
                <div className="flex items-center justify-center lg:justify-end">
                  <div className="h-32 w-32 rounded-lg bg-gray-100 p-2">
                    <QRCodeDisplay
                      qrData={registration.qr_data}
                      attendeeName={userFullName}
                      eventTitle={registration.event.title}
                      ticketType={registration.ticket_type.name}
                      size={112}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
