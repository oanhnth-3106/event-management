// =====================================================================
// Organizer: Event Attendees Page
// =====================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

interface AttendeesPageProps {
  params: {
    eventId: string;
  };
}

export default async function AttendeesPage({ params }: AttendeesPageProps) {
  const supabase = createServerClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch event
  const { data: event } = await supabase
    .from('events')
    .select('id, title, organizer_id')
    .eq('id', params.eventId)
    .eq('organizer_id', user.id)
    .single();

  if (!event) {
    redirect('/organizer/events');
  }

  // Fetch attendees
  const { data: registrations } = await supabase
    .from('registrations')
    .select(`
      id,
      ticket_code,
      status,
      checked_in_at,
      created_at,
      user:profiles!registrations_user_id_fkey(
        full_name,
        email
      ),
      ticket_type:ticket_types(
        name,
        price
      )
    `)
    .eq('event_id', params.eventId)
    .order('created_at', { ascending: false });

  const attendees = registrations || [];
  const totalAttendees = attendees.length;
  const checkedInCount = attendees.filter((a: any) => a.status === 'checked_in').length;
  const confirmedCount = attendees.filter((a: any) => a.status === 'confirmed').length;
  const cancelledCount = attendees.filter((a: any) => a.status === 'cancelled').length;

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
        <h1 className="text-3xl font-bold text-gray-900">Attendees</h1>
        <p className="mt-2 text-gray-600">
          Manage registrations for {event.title}
        </p>
      </div>

      {/* Statistics */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Total Registered</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalAttendees}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Checked In</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{checkedInCount}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Confirmed</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{confirmedCount}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-sm text-gray-600">Cancelled</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{cancelledCount}</p>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Attendee List
            </h2>
            <button className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Export CSV
            </button>
          </div>
        </div>

        {attendees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Attendee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ticket Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ticket Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Checked In
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {attendees.map((attendee: any) => (
                  <tr key={attendee.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {attendee.user?.full_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {attendee.user?.email}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {attendee.ticket_type?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${attendee.ticket_type?.price?.toFixed(2)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <code className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-800">
                        {attendee.ticket_code}
                      </code>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          attendee.status === 'checked_in'
                            ? 'bg-green-100 text-green-800'
                            : attendee.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {attendee.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(attendee.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {attendee.checked_in_at
                        ? new Date(attendee.checked_in_at).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No attendees yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Attendees will appear here once they register for your event.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
