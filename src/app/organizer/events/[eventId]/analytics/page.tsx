// =====================================================================
// Organizer: Event Analytics Page
// =====================================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

interface AnalyticsPageProps {
  params: {
    eventId: string;
  };
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const supabase = createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.eventId)
    .eq("organizer_id", user.id)
    .single();

  if (!event) {
    redirect("/organizer/events");
  }

  // Fetch ticket types with sales data
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select(
      `
      id,
      name,
      price,
      quantity,
      available,
      registrations:registrations(count)
    `,
    )
    .eq("event_id", params.eventId);

  // Fetch registrations by status
  const { data: registrations } = await supabase
    .from("registrations")
    .select("status, created_at, ticket_type_id, ticket_types!inner(price)")
    .eq("event_id", params.eventId);

  // Calculate statistics
  const totalRegistrations = registrations?.length || 0;
  const confirmedCount =
    registrations?.filter((r) => r.status === "confirmed").length || 0;
  const checkedInCount =
    registrations?.filter((r) => r.status === "checked_in").length || 0;
  const cancelledCount =
    registrations?.filter((r) => r.status === "cancelled").length || 0;

  const totalRevenue =
    registrations?.reduce((sum: number, reg: any) => {
      if (reg.status !== "cancelled") {
        return sum + (reg.ticket_types?.price || 0);
      }
      return sum;
    }, 0) || 0;

  const totalCapacity =
    ticketTypes?.reduce((sum, tt) => sum + (tt.quantity || 0), 0) || 0;
  const totalSold =
    ticketTypes?.reduce(
      (sum, tt) => sum + ((tt.quantity || 0) - (tt.available || 0)),
      0,
    ) || 0;
  const occupancyRate =
    totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0;

  // Sales by ticket type
  const salesByType =
    ticketTypes?.map((tt) => ({
      name: tt.name,
      sold: (tt.quantity || 0) - (tt.available || 0),
      available: tt.available || 0,
      total: tt.quantity || 0,
      revenue: ((tt.quantity || 0) - (tt.available || 0)) * (tt.price || 0),
    })) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/organizer/events/${params.eventId}`}
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
          Back to Event Details
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-2 text-gray-600">
          Performance insights for {event.title}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-blue-500 p-3">
              <svg
                className="h-6 w-6 text-white"
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
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Registrations</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalRegistrations}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-green-500 p-3">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-purple-500 p-3">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {occupancyRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-yellow-500 p-3">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Checked In</p>
              <p className="text-2xl font-bold text-gray-900">
                {checkedInCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Status Breakdown */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Registration Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Confirmed</span>
              <div className="flex items-center">
                <div className="mr-2 h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${totalRegistrations > 0 ? (confirmedCount / totalRegistrations) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {confirmedCount}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Checked In</span>
              <div className="flex items-center">
                <div className="mr-2 h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${totalRegistrations > 0 ? (checkedInCount / totalRegistrations) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {checkedInCount}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cancelled</span>
              <div className="flex items-center">
                <div className="mr-2 h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-red-500"
                    style={{
                      width: `${totalRegistrations > 0 ? (cancelledCount / totalRegistrations) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {cancelledCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sales by Ticket Type */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Sales by Ticket Type
          </h2>
          {salesByType.length > 0 ? (
            <div className="space-y-4">
              {salesByType.map((type) => (
                <div key={type.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {type.name}
                    </span>
                    <span className="text-sm text-gray-600">
                      {type.sold} / {type.total} sold
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${type.total > 0 ? (type.sold / type.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Revenue: ${type.revenue.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No ticket types configured yet.
            </p>
          )}
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Ticket Type Details
        </h2>
        {salesByType.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ticket Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Sold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {salesByType.map((type) => (
                  <tr key={type.name}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {type.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {type.total}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {type.sold}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {type.available}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      ${type.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No data available.</p>
        )}
      </div>
    </div>
  );
}
