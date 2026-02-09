// =====================================================================
// API Route: GET /api/my/events
// =====================================================================
// Purpose: List events organized by the authenticated user
// Authorization: Authenticated user with organizer or admin role
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient, requireAuth } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createServerErrorResponse } from '@/lib/api-utils';

/**
 * GET /api/my/events
 * 
 * Lists all events organized by the authenticated user
 * 
 * Query Parameters:
 * - status?: 'draft' | 'published' | 'cancelled' | 'completed'
 * 
 * Response:
 * - 200: List of events
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // ----------------------------------------------------------------
    // 1. AUTHENTICATE USER
    // ----------------------------------------------------------------
    const supabase = createServerClient();
    const user = await requireAuth();
    
    if (!user) {
      return createUnauthorizedResponse();
    }
    
    // Use service client to bypass RLS for querying organizer's own events
    const supabaseService = createServiceClient();
    
    // ----------------------------------------------------------------
    // 2. PARSE QUERY PARAMETERS
    // ----------------------------------------------------------------
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // ----------------------------------------------------------------
    // 3. FETCH USER'S EVENTS
    // ----------------------------------------------------------------
    let query = supabaseService
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
        created_at,
        ticket_types(
          id,
          name,
          description,
          price,
          quantity,
          available
        )
      `)
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false });
    
    // Apply status filter
    if (status && ['draft', 'published', 'cancelled', 'completed'].includes(status)) {
      query = query.eq('status', status);
    }
    
    const { data: events, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // ----------------------------------------------------------------
    // 4. ENRICH WITH STATS
    // ----------------------------------------------------------------
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        const { count: registrationCount } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .in('status', ['confirmed', 'checked_in']);
        
        const { count: checkedInCount } = await supabase
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('status', 'checked_in');
        
        const totalTickets = event.ticket_types?.reduce(
          (sum: number, tt: any) => sum + tt.quantity,
          0
        ) || 0;
        
        const availableTickets = event.ticket_types?.reduce(
          (sum: number, tt: any) => sum + tt.available,
          0
        ) || 0;
        
        return {
          ...event,
          stats: {
            totalTickets,
            availableTickets,
            soldTickets: totalTickets - availableTickets,
            registrationCount: registrationCount || 0,
            checkedInCount: checkedInCount || 0,
            isFull: availableTickets === 0,
          },
        };
      })
    );
    
    // ----------------------------------------------------------------
    // 5. RETURN SUCCESS
    // ----------------------------------------------------------------
    return NextResponse.json({
      success: true,
      data: enrichedEvents,
    });
    
  } catch (error) {
    return createServerErrorResponse(error);
  }
}
