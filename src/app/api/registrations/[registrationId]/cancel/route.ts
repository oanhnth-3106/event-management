// =====================================================================
// API Route: POST /api/registrations/[registrationId]/cancel
// =====================================================================
// Purpose: Cancel a registration and restore ticket availability
// Command: CMD-010 CancelRegistration
// Authorization: Self (own registration) OR Event organizer OR Admin
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cancelRegistration } from '@/lib/commands';
import { createServerClient, requireAuth } from '@/lib/supabase/server';

/**
 * POST /api/registrations/[registrationId]/cancel
 * 
 * Cancels a registration and restores ticket availability
 * 
 * Request Body: (empty)
 * 
 * Response:
 * - 200: Registration cancelled successfully
 * - 400: Business rule violation
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 404: Registration not found
 * - 409: Already cancelled or checked in
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { registrationId: string } }
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
    const result = await cancelRegistration({
      registrationId: params.registrationId,
      userId: user.id,
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
        message: 'Registration cancelled successfully.',
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('[API /registrations/[registrationId]/cancel] Unexpected error:', error);
    
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
  if (errorCode === 'EVENT_ENDED') return 400;
  if (errorCode === 'EVENT_CANCELLED') return 400;
  if (errorCode === 'AUTHORIZATION_ERROR' || errorCode === 'UNAUTHORIZED') return 403;
  if (errorCode === 'NOT_FOUND' || errorCode.endsWith('_NOT_FOUND')) return 404;
  if (errorCode === 'ALREADY_CANCELLED') return 409;
  if (errorCode === 'ALREADY_CHECKED_IN') return 409;
  return 400;
}
