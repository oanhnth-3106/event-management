// =====================================================================
// API Route: POST /api/events/[eventId]/send-reminder
// =====================================================================
// Purpose: Queue reminder emails (24h/2h before event)
// Command: CMD-008 SendEventReminder
// Authorization: Admin only (or scheduled job)
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendEventReminder } from '@/lib/commands';
import { createServerClient, requireAuth, requireRole } from '@/lib/supabase/server';
import type { SendEventReminderInput } from '@/types/command.types';

/**
 * POST /api/events/[eventId]/send-reminder
 * 
 * Queues reminder emails for event attendees
 * 
 * Request Body:
 * - reminderType: '24h_before' | '2h_before'
 * 
 * Response:
 * - 200: Reminder emails queued successfully
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden (admin only)
 * - 404: Event not found
 * - 409: Reminder already sent
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // ----------------------------------------------------------------
    // 1. AUTHENTICATE USER (Admin only)
    // ----------------------------------------------------------------
    const supabase = createServerClient();
    const user = await requireAuth();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify admin role
    const profile = await requireRole(['admin']);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Admin role required' },
        { status: 403 }
      );
    }
    
    // ----------------------------------------------------------------
    // 2. PARSE REQUEST BODY
    // ----------------------------------------------------------------
    let body: { reminderType?: '24h' | '2h' };
    
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
    if (!body.reminderType) {
      return NextResponse.json(
        { 
          error: 'Missing required field',
          missingFields: ['reminderType'],
        },
        { status: 400 }
      );
    }
    
    if (!['24h', '2h'].includes(body.reminderType)) {
      return NextResponse.json(
        { 
          error: 'Invalid reminder type',
          validTypes: ['24h', '2h'],
        },
        { status: 400 }
      );
    }
    
    // ----------------------------------------------------------------
    // 4. EXECUTE COMMAND
    // ----------------------------------------------------------------
    const input: SendEventReminderInput = {
      eventId: params.eventId,
      reminderType: body.reminderType,
    };
    
    const result = await sendEventReminder(input);
    
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
        message: `Reminder emails queued for ${result.data?.recipientCount || 0} attendees.`,
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('[API /events/[eventId]/send-reminder] Unexpected error:', error);
    
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
  if (errorCode === 'NO_ATTENDEES') return 400;
  if (errorCode === 'NO_REGISTRATIONS') return 400;
  if (errorCode === 'AUTHORIZATION_ERROR' || errorCode === 'UNAUTHORIZED') return 403;
  if (errorCode === 'NOT_FOUND' || errorCode.endsWith('_NOT_FOUND')) return 404;
  if (errorCode === 'REMINDER_ALREADY_SENT') return 409;
  if (errorCode === 'ALREADY_SENT') return 409;
  return 400;
}
