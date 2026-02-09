// =====================================================================
// API Route: POST /api/events/create
// =====================================================================
// Purpose: Create a new event (draft status)
// Command: CMD-001 CreateEvent
// Authorization: Organizer or Admin role required
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createEvent } from '@/lib/commands';
import { createServerClient, requireAuth } from '@/lib/supabase/server';
import type { CreateEventInput } from '@/types/command.types';

/**
 * POST /api/events/create
 * 
 * Creates a new event in draft status
 * 
 * Request Body:
 * - title: string (5-200 chars)
 * - description: string (50-5000 chars)
 * - startDate: ISO 8601 datetime
 * - endDate: ISO 8601 datetime
 * - location: string (5-200 chars)
 * - capacity: number (> 0, <= 100000)
 * - imageUrl?: string (optional)
 * 
 * Response:
 * - 201: Event created successfully
 * - 400: Validation error
 * - 401: Unauthorized
 * - 403: Forbidden (not organizer/admin)
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
    let body: Partial<CreateEventInput>;
    
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
    const requiredFields = ['title', 'description', 'startDate', 'endDate', 'location', 'capacity'];
    const missingFields = requiredFields.filter((field) => !body[field as keyof CreateEventInput]);
    
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
    const input: CreateEventInput = {
      organizerId: user.id,
      title: body.title!,
      description: body.description!,
      startDate: body.startDate!,
      endDate: body.endDate!,
      location: body.location!,
      capacity: body.capacity!,
      imageUrl: body.imageUrl,
    };
    
    const result = await createEvent(input);
    
    // ----------------------------------------------------------------
    // 5. HANDLE RESULT
    // ----------------------------------------------------------------
    if (!result.success && result.error) {
      // Map error codes to HTTP status codes
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
        message: 'Event created successfully',
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('[API /events/create] Unexpected error:', error);
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Map command error codes to HTTP status codes
 */
function getErrorStatusCode(errorCode: string): number {
  // Validation errors
  if (errorCode === 'VALIDATION_ERROR') return 400;
  if (errorCode.startsWith('INVALID_')) return 400;
  
  // Authorization errors
  if (errorCode === 'AUTHORIZATION_ERROR') return 403;
  if (errorCode === 'UNAUTHORIZED') return 403;
  
  // Not found errors
  if (errorCode === 'NOT_FOUND') return 404;
  if (errorCode.endsWith('_NOT_FOUND')) return 404;
  
  // Conflict errors
  if (errorCode === 'CONFLICT') return 409;
  if (errorCode.startsWith('DUPLICATE_')) return 409;
  if (errorCode.includes('_EXISTS')) return 409;
  
  // Business rule errors
  if (errorCode.startsWith('ALREADY_')) return 409;
  
  // Default to 400 for business rule violations
  return 400;
}
