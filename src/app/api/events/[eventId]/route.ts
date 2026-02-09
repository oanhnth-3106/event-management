// =====================================================================
// API Route: GET /api/events/[eventId]
// =====================================================================
// Purpose: Get event details by ID or slug
// Authorization: Public for published events, organizer/admin for drafts
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getCurrentUser } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createServerErrorResponse } from '@/lib/api-utils';

/**
 * GET /api/events/[eventId]
 * 
 * Retrieves detailed event information
 * 
 * Response:
 * - 200: Event details
 * - 404: Event not found
 * - 403: Forbidden (draft event, not organizer)
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = createServerClient();
    const user = await getCurrentUser();
    
    // ----------------------------------------------------------------
    // 1. FETCH EVENT
    // ----------------------------------------------------------------
    // Try by ID first, then by slug
    let query = supabase
      .from('events')
      .select(`
        id,
        slug,
        title,
        description,
        start_date,
        end_date,
        location,
        capacity,
        image_url,
        status,
        published_at,
        organizer_id,
        organizer:profiles!events_organizer_id_fkey(
          full_name,
          email
        ),
        ticket_types(
          id,
          name,
          description,
          price,
          quantity,
          available
        )
      `)
      .or(`id.eq.${params.eventId},slug.eq.${params.eventId}`)
      .single();
    
    const { data: event, error } = await query;
    
    if (error || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // ----------------------------------------------------------------
    // 2. CHECK ACCESS PERMISSIONS
    // ----------------------------------------------------------------
    // Draft events only visible to organizer and admins
    if (event.status === 'draft') {
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      
      // Check if user is organizer
      const isOrganizer = event.organizer_id === user.id;
      
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const isAdmin = profile?.role === 'admin';
      
      if (!isOrganizer && !isAdmin) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }
    }
    
    // ----------------------------------------------------------------
    // 3. GET REGISTRATION COUNT
    // ----------------------------------------------------------------
    const { count: registrationCount } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .in('status', ['confirmed', 'checked_in']);
    
    // ----------------------------------------------------------------
    // 4. CALCULATE AVAILABILITY
    // ----------------------------------------------------------------
    const totalTickets = event.ticket_types?.reduce(
      (sum, tt) => sum + tt.quantity,
      0
    ) || 0;
    
    const availableTickets = event.ticket_types?.reduce(
      (sum, tt) => sum + tt.available,
      0
    ) || 0;
    
    const soldTickets = totalTickets - availableTickets;
    
    // ----------------------------------------------------------------
    // 5. RETURN EVENT DATA
    // ----------------------------------------------------------------
    return NextResponse.json({
      success: true,
      data: {
        ...event,
        stats: {
          totalTickets,
          availableTickets,
          soldTickets,
          registrationCount: registrationCount || 0,
          isFull: availableTickets === 0,
        },
      },
    });
    
  } catch (error) {
    return createServerErrorResponse(error);
  }
}

/**
 * PATCH /api/events/[eventId]
 * 
 * Updates event details
 * 
 * Request Body:
 * - title?: string
 * - description?: string
 * - startDate?: string (ISO 8601)
 * - endDate?: string (ISO 8601)
 * - location?: string
 * - capacity?: number
 * - imageUrl?: string
 * 
 * Response:
 * - 200: Event updated successfully
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden (not organizer)
 * - 404: Event not found
 * - 500: Server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = createServiceClient(); // Use service client for update
    const userSupabase = createServerClient(); // Use server client for auth
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // ----------------------------------------------------------------
    // 1. FETCH EVENT AND CHECK OWNERSHIP
    // ----------------------------------------------------------------
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select('id, organizer_id, status')
      .eq('id', params.eventId)
      .single();
    
    if (fetchError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Type cast after null check
    const eventData = event as { id: string; organizer_id: string; status: string };
    
    // Check if user is organizer
    if (eventData.organizer_id !== user.id) {
      // Check if admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const profileData = profile as { role: string } | null;
      
      if (profileData?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only the event organizer can update this event' },
          { status: 403 }
        );
      }
    }
    
    // ----------------------------------------------------------------
    // 2. PARSE REQUEST BODY
    // ----------------------------------------------------------------
    let body: any;
    
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // ----------------------------------------------------------------
    // 3. BUILD UPDATE OBJECT
    // ----------------------------------------------------------------
    const updates: any = {};
    
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.startDate !== undefined) updates.start_date = body.startDate;
    if (body.endDate !== undefined) updates.end_date = body.endDate;
    if (body.location !== undefined) updates.location = body.location;
    if (body.capacity !== undefined) updates.capacity = body.capacity;
    if (body.imageUrl !== undefined) updates.image_url = body.imageUrl || null;
    
    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    // ----------------------------------------------------------------
    // 4. UPDATE EVENT
    // ----------------------------------------------------------------
    const { data: updatedEvent, error: updateError } = await supabase
      .from('events')
      // @ts-expect-error - Supabase type inference issue with service client
      .update(updates as any)
      .eq('id', params.eventId)
      .select()
      .single();
    
    if (updateError) {
      console.error('[PATCH /api/events/[eventId]] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update event', details: updateError.message },
        { status: 500 }
      );
    }
    
    if (!updatedEvent) {
      console.error('[PATCH /api/events/[eventId]] No event returned after update');
      return NextResponse.json(
        { error: 'Failed to update event - no data returned' },
        { status: 500 }
      );
    }
    
    // ----------------------------------------------------------------
    // 5. RETURN SUCCESS
    // ----------------------------------------------------------------
    return NextResponse.json({
      success: true,
      data: updatedEvent,
      message: 'Event updated successfully',
    });
    
  } catch (error) {
    return createServerErrorResponse(error);
  }
}
