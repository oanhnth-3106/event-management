// =====================================================================
// Create Event Page
// =====================================================================
// Purpose: Create new event
// Route: /organizer/create
// Authentication: Required (organizer or admin)
// =====================================================================

import { requireRole } from "@/lib/auth/helpers";
import { CreateEventForm } from "@/components/events/CreateEventForm";
import Link from "next/link";

export default async function CreateEventPage() {
  await requireRole(["organizer", "admin"]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/organizer/events"
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
            Back to My Events
          </Link>
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Create New Event
            </h1>
            <p className="mt-2 text-gray-600">
              Fill in the details below to create your event. You can add ticket
              types and publish it later.
            </p>
          </div>

          <div className="rounded-lg bg-white p-8 shadow-sm">
            <CreateEventForm />
          </div>
        </div>
      </div>
    </div>
  );
}
