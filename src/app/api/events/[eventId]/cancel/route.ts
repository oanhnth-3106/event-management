// =====================================================================
// API Route: POST /api/events/[eventId]/cancel
// =====================================================================
// Purpose: Cancel an event and notify attendees
// Command: CMD-009 CancelEvent
// Authorization: Event organizer or Admin role required
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cancelEvent } from '@/lib/commands';
import { createServerClient, requireAuth } from '@/lib/supabase/server';

/**
 * POST /api/events/[eventId]/cancel
 * 
 * Cancels an event and notifies all attendees
 * 
 * Request Body:
 * - reason: string (10-500 chars, required)
 * 
 * Response:
 * - 200: Event cancelled successfully
 * - 400: Validation error or business rule violation
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 404: Event not found
 * - 409: Already cancelled
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // ----------------------------------------------------------------
    // 1. AUTHENTICATE USER
    // ----------------------------------------------------------------
    const supabase = createServerClient();
    const user = await requireAuth();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // ----------------------------------------------------------------
    // 2. PARSE REQUEST BODY
    // ----------------------------------------------------------------
    let body: { reason?: string };
    
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
    if (!body.reason) {
      return NextResponse.json(
        { 
          error: 'Missing required field',
          missingFields: ['reason'],
        },
        { status: 400 }
      );
    }
    
    // ----------------------------------------------------------------
    // 4. EXECUTE COMMAND
    // ----------------------------------------------------------------
    const result = await cancelEvent({
      eventId: params.eventId,
      organizerId: user.id,
      reason: body.reason,
    });
    
    // ----------------------------------------------------------------
    // 5. HANDLE RESULT
    // ----------------------------------------------------------------
    if (!result.success && result.error) {
      const statusCode = getErrorStatusCode(result.error.code);
      
      return NextResponse.json(
        {
          error: result.error.message,
          code: result.error.code,
        },
        { status: statusCode }
      );
    }
    
    // ----------------------------------------------------------------
    // 6. RETURN SUCCESS
    // ----------------------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        data: result.data,
        message: 'Event cancelled successfully.',
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('[API /events/[eventId]/cancel] Unexpected error:', error);
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function getErrorStatusCode(errorCode: string): number {
  if (errorCode === 'VALIDATION_ERROR') return 400;
  if (errorCode.startsWith('INVALID_')) return 400;
  if (errorCode === 'EVENT_ENDED') return 400;
  if (errorCode === 'AUTHORIZATION_ERROR' || errorCode === 'UNAUTHORIZED') return 403;
  if (errorCode === 'NOT_FOUND' || errorCode.endsWith('_NOT_FOUND')) return 404;
  if (errorCode === 'ALREADY_CANCELLED') return 409;
  return 400;
}
