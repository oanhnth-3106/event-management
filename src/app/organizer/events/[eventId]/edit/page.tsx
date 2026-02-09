// =====================================================================
// Organizer: Edit Event Page
// =====================================================================

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import EditEventForm from "@/components/organizer/EditEventForm";

interface EditEventPageProps {
  params: {
    eventId: string;
  };
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  const supabase = createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch event details
  const { data: event, error } = await supabase
    .from("events")
    .select(
      `
      *,
      ticket_types(*)
    `,
    )
    .eq("id", params.eventId)
    .eq("organizer_id", user.id)
    .single();

  if (error || !event) {
    redirect("/organizer/events");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
        <p className="mt-2 text-gray-600">
          Update your event details and settings
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <EditEventForm event={event} />
      </div>
    </div>
  );
}
