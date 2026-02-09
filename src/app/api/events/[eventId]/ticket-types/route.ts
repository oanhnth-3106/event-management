// =====================================================================
// API Route: POST /api/events/[eventId]/ticket-types
// =====================================================================
// Purpose: Create or update ticket type for an event
// Command: CMD-002 ConfigureTicketType
// Authorization: Event organizer or Admin role required
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { configureTicketType } from '@/lib/commands';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import type { ConfigureTicketTypeInput } from '@/types/command.types';

/**
 * POST /api/events/[eventId]/ticket-types
 * 
 * Creates or updates a ticket type for an event
 * 
 * Request Body:
 * - name: string (3-100 chars)
 * - description?: string (<= 500 chars)
 * - price: number (>= 0)
 * - quantity: number (> 0, <= 100000)
 * - ticketTypeId?: string (for update)
 * 
 * Response:
 * - 201: Ticket type created
 * - 200: Ticket type updated
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 404: Event not found
 * - 409: Duplicate ticket type name
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
    let body: Partial<Omit<ConfigureTicketTypeInput, 'eventId' | 'userId'>>;
    
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
    const requiredFields = ['name', 'price', 'quantity'];
    const missingFields = requiredFields.filter((field) => body[field as keyof typeof body] === undefined);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missingFields,
        },
        { status: 400 }
      );
    }
    
    // ----------------------------------------------------------------
    // 4. EXECUTE COMMAND
    // ----------------------------------------------------------------
    const input: ConfigureTicketTypeInput = {
      eventId: params.eventId,
      organizerId: user.id,
      name: body.name!,
      description: body.description,
      price: body.price!,
      quantity: body.quantity!,
      ticketTypeId: body.ticketTypeId,
    };
    
    const result = await configureTicketType(input);
    
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
    const isUpdate = !!body.ticketTypeId;
    
    return NextResponse.json(
      {
        success: true,
        data: result.data,
        message: isUpdate 
          ? 'Ticket type updated successfully'
          : 'Ticket type created successfully',
      },
      { status: isUpdate ? 200 : 201 }
    );
    
  } catch (error) {
    console.error('[API /events/[eventId]/ticket-types] Unexpected error:', error);
    
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
  if (errorCode === 'AUTHORIZATION_ERROR' || errorCode === 'UNAUTHORIZED') return 403;
  if (errorCode === 'NOT_FOUND' || errorCode.endsWith('_NOT_FOUND')) return 404;
  if (errorCode === 'CONFLICT' || errorCode.startsWith('DUPLICATE_')) return 409;
  if (errorCode.startsWith('ALREADY_')) return 409;
  return 400;
}
