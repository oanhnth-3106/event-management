// =====================================================================
// API Route: GET /api/my/registrations
// =====================================================================
// Purpose: List user's registrations
// Authorization: Authenticated user
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import { createUnauthorizedResponse, createServerErrorResponse } from '@/lib/api-utils';

/**
 * GET /api/my/registrations
 * 
 * Lists all registrations for the authenticated user
 * 
 * Query Parameters:
 * - status?: 'confirmed' | 'checked_in' | 'cancelled'
 * 
 * Response:
 * - 200: List of registrations
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
    
    // ----------------------------------------------------------------
    // 2. PARSE QUERY PARAMETERS
    // ----------------------------------------------------------------
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // ----------------------------------------------------------------
    // 3. FETCH REGISTRATIONS
    // ----------------------------------------------------------------
    let query = supabase
      .from('registrations')
      .select(`
        id,
        status,
        qr_data,
        checked_in_at,
        created_at,
        event:events!registrations_event_id_fkey(
          id,
          slug,
          title,
          description,
          start_date,
          end_date,
          location,
          image_url,
          status
        ),
        ticket_type:ticket_types!registrations_ticket_type_id_fkey(
          id,
          name,
          description,
          price
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    // Apply status filter
    if (status && ['confirmed', 'checked_in', 'cancelled'].includes(status)) {
      query = query.eq('status', status);
    }
    
    const { data: registrations, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // ----------------------------------------------------------------
    // 4. RETURN SUCCESS
    // ----------------------------------------------------------------
    return NextResponse.json({
      success: true,
      data: registrations,
    });
    
  } catch (error) {
    return createServerErrorResponse(error);
  }
}
