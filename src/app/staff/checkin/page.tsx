// =====================================================================
// Staff Check-in Page
// =====================================================================
// Purpose: QR code scanner for staff to check-in attendees
// Route: /staff/checkin
// =====================================================================

import { createServerClient, requireAuth } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { QRScanner } from "@/components/staff/QRScanner";

async function getStaffEvents(userId: string) {
  const supabase = createServerClient();

  // Get user profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (
    !profile ||
    (profile.role !== "staff" &&
      profile.role !== "organizer" &&
      profile.role !== "admin")
  ) {
    return null;
  }

  // Get events where user is organizer (for organizers) or all published events (for staff)
  let query = supabase
    .from("events")
    .select("id, title, start_date, status")
    .eq("status", "published")
    .order("start_date", { ascending: true });

  if (profile.role === "organizer") {
    query = query.eq("organizer_id", userId);
  }

  const { data: events } = await query;

  return { events: events || [], role: profile.role };
}

export default async function StaffCheckinPage() {
  const user = await requireAuth();

  if (!user) {
    redirect("/auth/login?returnUrl=/staff/checkin");
  }

  const data = await getStaffEvents(user.id);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">
            You need staff or organizer privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  const { events, role } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Event Check-in</h1>
          <p className="text-gray-600 mt-2">
            Scan attendee QR codes to check them in
          </p>
          <div className="mt-2 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
            Role: {role.charAt(0).toUpperCase() + role.slice(1)}
          </div>
        </div>

        {/* QR Scanner Component */}
        <QRScanner events={events} />

        {/* Instructions */}
        <div className="mt-8 rounded-lg bg-blue-50 border border-blue-200 p-6">
          <h3 className="font-semibold text-blue-900 mb-3">
            How to use the QR Scanner:
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Select the event you're checking in attendees for</li>
            <li>Click "Start Scanner" to activate your device camera</li>
            <li>Point the camera at the attendee's QR code ticket</li>
            <li>
              The system will automatically validate and check-in the attendee
            </li>
            <li>You'll see a success or error message immediately</li>
          </ol>
        </div>

        {/* Recent Check-ins */}
        <div className="mt-8 rounded-lg bg-white shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Available Events
          </h3>
          {events.length === 0 ? (
            <p className="text-gray-600">No events available for check-in.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(event.start_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
