// =====================================================================
// My Registrations Page
// =====================================================================
// Purpose: View user's event registrations (tickets)
// Route: /my/registrations
// Authentication: Required
// =====================================================================

import { requireAuth } from "@/lib/auth/helpers";
import { createServerClient } from "@/lib/supabase/server";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { QRCodeDisplay } from "@/components/qr/QRCodeDisplay";
import { RegistrationTabs } from "@/components/registrations/RegistrationTabs";

export default async function MyRegistrationsPage() {
  const { user, profile } = await requireAuth("/my/registrations");

  const supabase = createServerClient();

  // Fetch user's registrations
  const { data: registrations } = await supabase
    .from("registrations")
    .select(
      `
      *,
      event:events(*),
      ticket_type:ticket_types(*)
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Group by status
  const confirmed =
    registrations?.filter((r) => r.status === "confirmed") || [];
  const checkedIn =
    registrations?.filter((r) => r.status === "checked_in") || [];
  const cancelled =
    registrations?.filter((r) => r.status === "cancelled") || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
          <p className="mt-2 text-gray-600">
            View and manage your event registrations
          </p>
        </div>

        {/* Tabs and Content */}
        <RegistrationTabs
          confirmed={confirmed}
          checkedIn={checkedIn}
          cancelled={cancelled}
          userFullName={profile.full_name || ""}
        />
      </div>
    </div>
  );
}
