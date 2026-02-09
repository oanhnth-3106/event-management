// =====================================================================
// API Route: POST /api/events/[eventId]/register
// =====================================================================
// Purpose: Register for an event and receive QR ticket
// Command: CMD-004 RegisterForEvent (includes CMD-005 QR generation)
// Authorization: Authenticated user
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { registerForEvent } from '@/lib/commands';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import type { RegisterForEventInput } from '@/types/command.types';

/**
 * POST /api/events/[eventId]/register
 * 
 * Registers an authenticated user for an event
 * 
 * Request Body:
 * - ticketTypeId: string (UUID)
 * 
 * Response:
 * - 201: Registration successful (includes QR code)
 * - 400: Validation error
 * - 401: Unauthorized
 * - 404: Event or ticket type not found
 * - 409: Duplicate registration or event full
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
    let body: { ticketTypeId?: string };
    
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
    if (!body.ticketTypeId) {
      return NextResponse.json(
        { 
          error: 'Missing required field',
          missingFields: ['ticketTypeId'],
        },
        { status: 400 }
      );
    }
    
    // ----------------------------------------------------------------
    // 4. EXECUTE COMMAND
    // ----------------------------------------------------------------
    const input: RegisterForEventInput = {
      eventId: params.eventId,
      userId: user.id,
      ticketTypeId: body.ticketTypeId,
    };
    
    const result = await registerForEvent(input);
    
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
    // 6. RETURN SUCCESS (with QR code)
    // ----------------------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        data: result.data,
        message: 'Registration successful! Check your email for your QR code ticket.',
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('[API /events/[eventId]/register] Unexpected error:', error);
    
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
  if (errorCode === 'EVENT_NOT_PUBLISHED') return 400;
  if (errorCode === 'EVENT_STARTED') return 400;
  if (errorCode === 'AUTHORIZATION_ERROR' || errorCode === 'UNAUTHORIZED') return 403;
  if (errorCode === 'NOT_FOUND' || errorCode.endsWith('_NOT_FOUND')) return 404;
  if (errorCode === 'DUPLICATE_REGISTRATION') return 409;
  if (errorCode === 'NO_TICKETS_AVAILABLE') return 409;
  if (errorCode === 'EVENT_FULL') return 409;
  return 400;
}
