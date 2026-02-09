// =====================================================================
// API Route: POST /api/events/[eventId]/register-enhanced
// =====================================================================
// Purpose: Register for an event with comprehensive validation
// Command: CMD-003 RegisterForEvent
// Authorization: Authenticated users only
// Rate Limiting: Recommended (prevent abuse)
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registerForEvent } from '@/lib/commands';
import { createServerClient } from '@/lib/supabase/server';
import type { RegisterForEventInput } from '@/types/command.types';

// =====================================================================
// REQUEST VALIDATION SCHEMA
// =====================================================================

const RegisterRequestSchema = z.object({
  ticketTypeId: z
    .string()
    .uuid('Ticket type ID must be a valid UUID')
    .describe('The ID of the ticket type to register for'),
  
  // Optional metadata for analytics/tracking
  metadata: z.object({
    source: z.string().optional(),
    referrer: z.string().optional(),
    campaignId: z.string().optional(),
  }).optional(),
});

type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// =====================================================================
// ERROR CODE MAPPINGS
// =====================================================================

const ERROR_STATUS_CODES: Record<string, number> = {
  // Validation Errors (400)
  VALIDATION_ERROR: 400,
  INVALID_INPUT: 400,
  INVALID_TICKET_TYPE: 400,
  EVENT_NOT_PUBLISHED: 400,
  EVENT_ALREADY_STARTED: 400,
  EVENT_CANCELLED: 400,
  
  // Authorization Errors (401/403)
  UNAUTHORIZED: 401,
  AUTHENTICATION_REQUIRED: 401,
  AUTHORIZATION_ERROR: 403,
  FORBIDDEN: 403,
  
  // Not Found Errors (404)
  NOT_FOUND: 404,
  EVENT_NOT_FOUND: 404,
  TICKET_TYPE_NOT_FOUND: 404,
  
  // Conflict Errors (409)
  DUPLICATE_REGISTRATION: 409,
  TICKETS_SOLD_OUT: 409,
  CAPACITY_EXCEEDED: 409,
  NO_TICKETS_AVAILABLE: 409,
  
  // Server Errors (500)
  INTERNAL_ERROR: 500,
  DATABASE_ERROR: 500,
};

// =====================================================================
// MAIN HANDLER
// =====================================================================

/**
 * POST /api/events/[eventId]/register-enhanced
 * 
 * Registers an authenticated user for an event with comprehensive validation.
 * 
 * Request Body:
 * ```json
 * {
 *   "ticketTypeId": "uuid-string",
 *   "metadata": {
 *     "source": "website|mobile|email",
 *     "referrer": "optional-referrer-url",
 *     "campaignId": "optional-marketing-campaign-id"
 *   }
 * }
 * ```
 * 
 * Success Response (201):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "registrationId": "uuid",
 *     "ticketCode": "alphanumeric-code",
 *     "qrData": "signed-qr-data-string",
 *     "status": "confirmed",
 *     "eventDetails": { ... },
 *     "ticketTypeDetails": { ... }
 *   },
 *   "message": "Registration successful! Check your email for your ticket."
 * }
 * ```
 * 
 * Error Responses:
 * - 400: Invalid request (validation failed, event not published, etc.)
 * - 401: Not authenticated
 * - 403: Not authorized
 * - 404: Event or ticket type not found
 * - 409: Duplicate registration, sold out, or capacity exceeded
 * - 500: Internal server error
 * 
 * Preconditions:
 * - User must be authenticated
 * - Event must exist and be published
 * - Event must not have started
 * - Ticket type must exist and belong to the event
 * - Ticket type must have available tickets
 * - User must not already be registered (non-cancelled registration)
 * - Event must not have reached capacity
 * 
 * Postconditions:
 * - Registration created with status 'confirmed'
 * - QR code generated with cryptographic signature
 * - Ticket type availability decremented by 1
 * - Confirmation email sent (async)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
): Promise<NextResponse> {
  try {
    // ----------------------------------------------------------------
    // STEP 1: VALIDATE EVENT ID PARAMETER
    // ----------------------------------------------------------------
    const eventId = params.eventId;
    
    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing event ID in URL path',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event ID must be a valid UUID',
          code: 'INVALID_INPUT',
          details: { eventId },
        },
        { status: 400 }
      );
    }
    
    // ----------------------------------------------------------------
    // STEP 2: AUTHENTICATE USER
    // ----------------------------------------------------------------
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please sign in to register for events.',
          code: 'AUTHENTICATION_REQUIRED',
        },
        { status: 401 }
      );
    }
    
    // ----------------------------------------------------------------
    // STEP 3: PARSE AND VALIDATE REQUEST BODY
    // ----------------------------------------------------------------
    let body: unknown;
    
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          code: 'VALIDATION_ERROR',
          details: {
            message: parseError instanceof Error ? parseError.message : 'JSON parse failed',
          },
        },
        { status: 400 }
      );
    }
    
    // Validate with Zod schema
    const validation = RegisterRequestSchema.safeParse(body);
    
    if (!validation.success) {
      const errors = validation.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      
      return NextResponse.json(
        {
          success: false,
          error: 'Request validation failed',
          code: 'VALIDATION_ERROR',
          validationErrors: errors,
        },
        { status: 400 }
      );
    }
    
    const requestData: RegisterRequest = validation.data;
    
    // ----------------------------------------------------------------
    // STEP 4: PREPARE COMMAND INPUT
    // ----------------------------------------------------------------
    const commandInput: RegisterForEventInput = {
      eventId: eventId,
      userId: user.id,
      ticketTypeId: requestData.ticketTypeId,
    };
    
    // ----------------------------------------------------------------
    // STEP 5: EXECUTE REGISTRATION COMMAND
    // ----------------------------------------------------------------
    console.log('[API Register] Executing registration command', {
      eventId,
      userId: user.id,
      ticketTypeId: requestData.ticketTypeId,
      metadata: requestData.metadata,
    });
    
    const result = await registerForEvent(commandInput);
    
    // ----------------------------------------------------------------
    // STEP 6: HANDLE COMMAND RESULT
    // ----------------------------------------------------------------
    if (!result.success) {
      // TypeScript refinement: error is guaranteed to exist when success is false
      const error = result.error!;
      const errorCode = error.code;
      const statusCode = ERROR_STATUS_CODES[errorCode] || 400;
      
      console.error('[API Register] Registration failed', {
        eventId,
        userId: user.id,
        errorCode,
        errorMessage: error.message,
        details: error.details,
      });
      
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: statusCode }
      );
    }
    
    // ----------------------------------------------------------------
    // STEP 7: RETURN SUCCESS RESPONSE
    // ----------------------------------------------------------------
    // TypeScript refinement: data is guaranteed to exist when success is true
    const registrationData = result.data!;
    
    console.log('[API Register] Registration successful', {
      eventId,
      userId: user.id,
      registrationId: registrationData.registrationId,
    });
    
    return NextResponse.json(
      {
        success: true,
        data: {
          registrationId: registrationData.registrationId,
          ticketCode: registrationData.ticketCode,
          qrData: registrationData.qrData,
          status: registrationData.status,
          eventDetails: registrationData.eventDetails,
          ticketTypeDetails: registrationData.ticketTypeDetails,
        },
        message: 'Registration successful! Check your email for your QR code ticket.',
      },
      { status: 201 }
    );
    
  } catch (error) {
    // ----------------------------------------------------------------
    // STEP 8: HANDLE UNEXPECTED ERRORS
    // ----------------------------------------------------------------
    console.error('[API Register] Unexpected error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while processing your registration',
        code: 'INTERNAL_ERROR',
        details: {
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/**
 * Get HTTP status code for a given error code
 */
function getStatusCodeForError(errorCode: string): number {
  return ERROR_STATUS_CODES[errorCode] || 400;
}

/**
 * Sanitize error details for client response
 * (Remove sensitive information if needed)
 */
function sanitizeErrorDetails(details: Record<string, any>): Record<string, any> {
  // Remove sensitive fields if present
  const sanitized = { ...details };
  delete sanitized.internalId;
  delete sanitized.stackTrace;
  delete sanitized.databaseError;
  
  return sanitized;
}
