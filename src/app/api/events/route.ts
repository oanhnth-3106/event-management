// =====================================================================
// API Route: GET /api/events
// =====================================================================
// Purpose: List published events with pagination and filtering
// Authorization: Public (no auth required for published events)
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createServerErrorResponse } from '@/lib/api-utils';

/**
 * GET /api/events
 * 
 * Lists published events with optional filtering
 * 
 * Query Parameters:
 * - status?: 'published' | 'upcoming' | 'ongoing' | 'past'
 * - page?: number (default: 1)
 * - limit?: number (default: 10, max: 100)
 * - search?: string (search in title/description)
 * 
 * Response:
 * - 200: List of events
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    
    // ----------------------------------------------------------------
    // 1. PARSE QUERY PARAMETERS
    // ----------------------------------------------------------------
    const status = searchParams.get('status') || 'published';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const search = searchParams.get('search') || '';
    
    const offset = (page - 1) * limit;
    
    // ----------------------------------------------------------------
    // 2. BUILD QUERY
    // ----------------------------------------------------------------
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
        organizer:profiles!events_organizer_id_fkey(
          full_name,
          email
        ),
        ticket_types(
          id,
          name,
          price,
          quantity,
          available
        )
      `, { count: 'exact' })
      .eq('status', 'published')
      .order('start_date', { ascending: true });
    
    // ----------------------------------------------------------------
    // 3. APPLY FILTERS
    // ----------------------------------------------------------------
    const now = new Date().toISOString();
    
    if (status === 'upcoming') {
      query = query.gt('start_date', now);
    } else if (status === 'ongoing') {
      query = query.lte('start_date', now).gte('end_date', now);
    } else if (status === 'past') {
      query = query.lt('end_date', now);
    }
    
    // Search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // ----------------------------------------------------------------
    // 4. EXECUTE QUERY WITH PAGINATION
    // ----------------------------------------------------------------
    const { data: events, error, count } = await query
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    // ----------------------------------------------------------------
    // 5. RETURN SUCCESS
    // ----------------------------------------------------------------
    return NextResponse.json({
      success: true,
      data: events,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
    
  } catch (error) {
    return createServerErrorResponse(error);
  }
}
