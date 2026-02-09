import { NextResponse } from 'next/server';
import { sendEventReminders } from '@/lib/email/helpers';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * Cron job to send 2-hour event reminders
 * Runs hourly
 * 
 * Vercel Cron: /api/cron/send-2h-reminders
 * Schedule: 0 * * * * (every hour)
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Calculate time window (1.5-2.5 hours from now)
    const in2Hours = new Date();
    in2Hours.setHours(in2Hours.getHours() + 2);
    const windowStart = new Date(in2Hours.getTime() - 1800000); // 1.5 hours
    const windowEnd = new Date(in2Hours.getTime() + 1800000); // 2.5 hours

    // Find published events starting in ~2 hours
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select(`
        *,
        registrations!inner (
          *,
          user:auth.users!inner (*),
          profile:profiles!inner (*),
          ticket_type:ticket_types (*)
        )
      `)
      .eq('status', 'published')
      .eq('registrations.status', 'confirmed')
      .gte('start_date', windowStart.toISOString())
      .lte('start_date', windowEnd.toISOString());

    if (eventsError) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const events = eventsData as any[] | null;

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events found in time window',
        eventCount: 0,
        emailsSent: 0,
      });
    }

    let totalSent = 0;
    let totalFailed = 0;

    // Send reminders for each event
    for (const event of events) {
      if (!event.registrations || event.registrations.length === 0) {
        continue;
      }

      try {
        const result = await sendEventReminders(
          event,
          event.registrations,
          '2h'
        );

        totalSent += result.successCount;
        totalFailed += result.failureCount;
      } catch (error) {
        totalFailed += event.registrations.length;
      }
    }

    const response = {
      success: true,
      eventCount: events.length,
      emailsSent: totalSent,
      emailsFailed: totalFailed,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
