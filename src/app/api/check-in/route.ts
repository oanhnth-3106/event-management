// =====================================================================
// API Route: POST /api/check-in
// =====================================================================
// Purpose: Check in attendee via QR code
// Command: CMD-006 CheckInTicket (includes CMD-007 QR validation)
// Authorization: Staff assigned to event
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkInTicket } from '@/lib/commands';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import type { CheckInTicketInput } from '@/types/command.types';

/**
 * POST /api/check-in
 * 
 * Checks in an attendee by validating QR code
 * 
 * Request Body:
 * - eventId: string (UUID)
 * - qrData: string (QR code content)
 * - method: 'qr' | 'manual'
 * - location?: string
 * - deviceInfo?: string
 * 
 * Response:
 * - 200: Check-in successful
 * - 400: Invalid QR code or business rule violation
 * - 401: Unauthorized
 * - 403: Staff not assigned to event
 * - 404: Registration not found
 * - 409: Already checked in
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
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
    let body: Partial<Omit<CheckInTicketInput, 'staffId'>>;
    
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
    const requiredFields = ['eventId', 'qrData', 'method'];
    const missingFields = requiredFields.filter((field) => !body[field as keyof typeof body]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields,
        },
        { status: 400 }
      );
    }
    
    // Validate method
    if (body.method !== 'qr' && body.method !== 'manual') {
      return NextResponse.json(
        { 
          error: 'Invalid check-in method',
          validMethods: ['qr', 'manual'],
        },
        { status: 400 }
      );
    }
    
    // ----------------------------------------------------------------
    // 4. EXECUTE COMMAND
    // ----------------------------------------------------------------
    const input: CheckInTicketInput = {
      eventId: body.eventId!,
      staffId: user.id,
      qrData: body.qrData!,
      method: body.method!,
      location: body.location,
      deviceInfo: body.deviceInfo,
    };
    
    const result = await checkInTicket(input);
    
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
        message: result.data?.message || 'Check-in successful',
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('[API /check-in] Unexpected error:', error);
    
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
  if (errorCode === 'INVALID_QR_CODE') return 400;
  if (errorCode === 'INVALID_SIGNATURE') return 400;
  if (errorCode === 'WRONG_EVENT') return 400;
  if (errorCode === 'EVENT_NOT_STARTED') return 400;
  if (errorCode === 'EVENT_ENDED') return 400;
  if (errorCode === 'REGISTRATION_CANCELLED') return 400;
  if (errorCode === 'AUTHORIZATION_ERROR' || errorCode === 'UNAUTHORIZED') return 403;
  if (errorCode === 'NOT_FOUND' || errorCode.endsWith('_NOT_FOUND')) return 404;
  if (errorCode === 'ALREADY_CHECKED_IN') return 409;
  return 400;
}
