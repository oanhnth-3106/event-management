// =====================================================================
// API Route: POST /api/staff/checkin
// =====================================================================
// Purpose: Check-in attendee using QR code
// Authorization: Staff or Organizer only
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient, requireAuth } from '@/lib/supabase/server';
import { verifyQRSignature } from '@/lib/qr';

/**
 * POST /api/staff/checkin
 * 
 * Checks in an attendee for an event
 * 
 * Request Body:
 * - registrationId: string (UUID)
 * - eventId: string (UUID)
 * 
 * Response:
 * - 200: Check-in successful
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden (not staff/organizer)
 * - 404: Registration not found
 * - 409: Already checked in
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // ----------------------------------------------------------------
    // 1. AUTHENTICATE USER
    // ----------------------------------------------------------------
    const user = await requireAuth();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const supabase = createServerClient();
    
    // Check if user is staff or organizer or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || (profile.role !== 'staff' && profile.role !== 'organizer' && profile.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Staff, organizer, or admin privileges required' },
        { status: 403 }
      );
    }
    
    // ----------------------------------------------------------------
    // 2. PARSE REQUEST BODY
    // ----------------------------------------------------------------
    let body: { registrationId?: string; eventId?: string };
    
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // ----------------------------------------------------------------
    // 3. VALIDATE REQUEST BODY
    // ----------------------------------------------------------------
    if (!body.registrationId || !body.eventId) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields: [
            ...(!body.registrationId ? ['registrationId'] : []),
            ...(!body.eventId ? ['eventId'] : []),
          ],
        },
        { status: 400 }
      );
    }
    
    // ----------------------------------------------------------------
    // 4. FETCH REGISTRATION
    // ----------------------------------------------------------------
    const { data: registration, error: regError } = await supabase
      .from('registrations')
      .select(`
        *,
        event:events(id, title, organizer_id),
        ticket_type:ticket_types(name),
        attendee:profiles!registrations_user_id_fkey(full_name)
      `)
      .eq('id', body.registrationId)
      .eq('event_id', body.eventId)
      .single();
    
    if (regError || !registration) {
      return NextResponse.json(
        { error: 'Registration not found or does not match event' },
        { status: 404 }
      );
    }
    
    // ----------------------------------------------------------------
    // 5. VERIFY QR CODE SIGNATURE
    // ----------------------------------------------------------------
    if (registration.qr_code) {
      try {
        const qrData = JSON.parse(registration.qr_code);
        const isValid = verifyQRSignature(qrData);
        
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid QR code signature' },
            { status: 400 }
          );
        }
      } catch (err) {
        console.error('QR verification error:', err);
        return NextResponse.json(
          { error: 'Invalid QR code format' },
          { status: 400 }
        );
      }
    }
    
    // ----------------------------------------------------------------
    // 6. CHECK IF ORGANIZER HAS PERMISSION
    // ----------------------------------------------------------------
    if (profile.role === 'organizer' && registration.event.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only check-in attendees for your own events' },
        { status: 403 }
      );
    }
    
    // ----------------------------------------------------------------
    // 7. VALIDATE REGISTRATION STATUS
    // ----------------------------------------------------------------
    if (registration.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This registration has been cancelled' },
        { status: 409 }
      );
    }
    
    if (registration.status === 'checked_in') {
      return NextResponse.json(
        { 
          error: 'Attendee already checked in',
          data: {
            attendeeName: registration.attendee?.full_name || 'Unknown',
            ticketType: registration.ticket_type?.name || 'N/A',
            checkedInAt: registration.checked_in_at,
          },
        },
        { status: 409 }
      );
    }
    
    // ----------------------------------------------------------------
    // 8. UPDATE REGISTRATION STATUS
    // ----------------------------------------------------------------
    console.log('[API /staff/checkin] Updating registration:', body.registrationId);
    
    // Use service client for privileged update
    const serviceSupabase = createServiceClient();
    
    const { data: updated, error: updateError } = await serviceSupabase
      .from('registrations')
      .update({
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id, // Add staff/organizer who checked in
      })
      .eq('id', body.registrationId)
      .select(`
        *,
        ticket_type:ticket_types(name),
        attendee:profiles!registrations_user_id_fkey(full_name)
      `)
      .single();
    
    if (updateError || !updated) {
      console.error('[API /staff/checkin] Check-in update error:', updateError);
      console.error('[API /staff/checkin] Update error details:', JSON.stringify(updateError, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to update check-in status',
          details: updateError?.message || 'Unknown error'
        },
        { status: 500 }
      );
    }
    
    console.log('[API /staff/checkin] Check-in successful:', updated.id);
    
    // ----------------------------------------------------------------
    // 9. RETURN SUCCESS
    // ----------------------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        message: 'Check-in successful',
        data: {
          registrationId: updated.id,
          attendeeName: updated.attendee?.full_name || 'Unknown',
          ticketType: updated.ticket_type?.name || 'N/A',
          checkedInAt: updated.checked_in_at,
        },
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('[API /staff/checkin] Unexpected error:', error);
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
