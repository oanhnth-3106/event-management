// =====================================================================
// API Route: POST /api/events/[eventId]/publish
// =====================================================================
// Purpose: Publish an event (draft → published)
// Command: CMD-003 PublishEvent
// Authorization: Event organizer or Admin role required
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { publishEvent } from '@/lib/commands';
import { createServerClient, requireAuth } from '@/lib/supabase/server';

/**
 * POST /api/events/[eventId]/publish
 * 
 * Publishes a draft event
 * 
 * Request Body: (empty)
 * 
 * Response:
 * - 200: Event published successfully
 * - 400: Validation error (incomplete event)
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 404: Event not found
 * - 409: Already published
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
    // 2. EXECUTE COMMAND
    // ----------------------------------------------------------------
    const result = await publishEvent({
      eventId: params.eventId,
      organizerId: user.id,
    });
    
    // ----------------------------------------------------------------
    // 3. HANDLE RESULT
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
    // 4. RETURN SUCCESS
    // ----------------------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        data: result.data,
        message: 'Event published successfully',
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('[API /events/[eventId]/publish] Unexpected error:', error);
    
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
  if (errorCode.includes('INCOMPLETE')) return 400;
  if (errorCode === 'NO_TICKET_TYPES') return 400;
  if (errorCode === 'AUTHORIZATION_ERROR' || errorCode === 'UNAUTHORIZED') return 403;
  if (errorCode === 'NOT_FOUND' || errorCode.endsWith('_NOT_FOUND')) return 404;
  if (errorCode.startsWith('ALREADY_')) return 409;
  return 400;
}
