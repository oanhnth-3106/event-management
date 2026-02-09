// =====================================================================
// API Utilities
// =====================================================================
// Shared utilities for API route handlers
// =====================================================================

import { NextResponse } from 'next/server';
import type { CommandExecutionError } from '@/lib/commands/errors';

/**
 * Map command error codes to HTTP status codes
 */
export function getErrorStatusCode(errorCode: string): number {
  // Validation errors (400)
  if (errorCode === 'VALIDATION_ERROR') return 400;
  if (errorCode.startsWith('INVALID_')) return 400;
  if (errorCode.includes('INCOMPLETE')) return 400;
  if (errorCode === 'NO_TICKET_TYPES') return 400;
  if (errorCode === 'NO_ATTENDEES') return 400;
  if (errorCode === 'NO_REGISTRATIONS') return 400;
  if (errorCode === 'EVENT_NOT_PUBLISHED') return 400;
  if (errorCode === 'EVENT_STARTED') return 400;
  if (errorCode === 'EVENT_NOT_STARTED') return 400;
  if (errorCode === 'EVENT_ENDED') return 400;
  if (errorCode === 'EVENT_CANCELLED') return 400;
  if (errorCode === 'WRONG_EVENT') return 400;
  if (errorCode === 'REGISTRATION_CANCELLED') return 400;
  
  // Authorization errors (403)
  if (errorCode === 'AUTHORIZATION_ERROR') return 403;
  if (errorCode === 'UNAUTHORIZED') return 403;
  
  // Not found errors (404)
  if (errorCode === 'NOT_FOUND') return 404;
  if (errorCode.endsWith('_NOT_FOUND')) return 404;
  
  // Conflict errors (409)
  if (errorCode === 'CONFLICT') return 409;
  if (errorCode.startsWith('DUPLICATE_')) return 409;
  if (errorCode.startsWith('ALREADY_')) return 409;
  if (errorCode.includes('_EXISTS')) return 409;
  if (errorCode === 'NO_TICKETS_AVAILABLE') return 409;
  if (errorCode === 'EVENT_FULL') return 409;
  
  // Default to 400 for business rule violations
  return 400;
}

/**
 * Create error response from command error
 */
export function createErrorResponse(error: CommandExecutionError) {
  const statusCode = getErrorStatusCode(error.code);
  
  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
      ...((error as any).metadata && { metadata: (error as any).metadata }),
    },
    { status: statusCode }
  );
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status: statusCode }
  );
}

/**
 * Create validation error response
 */
export function createValidationError(
  message: string,
  missingFields?: string[]
) {
  return NextResponse.json(
    {
      error: message,
      ...(missingFields && { missingFields }),
    },
    { status: 400 }
  );
}

/**
 * Create unauthorized response
 */
export function createUnauthorizedResponse(message: string = 'Authentication required') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Create forbidden response
 */
export function createForbiddenResponse(message: string = 'Insufficient permissions') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

/**
 * Create server error response
 */
export function createServerErrorResponse(error: unknown) {
  console.error('[API Error]', error);
  
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      message: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

/**
 * Parse JSON request body safely
 */
export async function parseRequestBody<T>(
  request: Request
): Promise<{ data: T | null; error: NextResponse | null }> {
  try {
    const data = await request.json();
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: createValidationError('Invalid JSON in request body'),
    };
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields<T extends Record<string, any>>(
  body: Partial<T>,
  requiredFields: (keyof T)[]
): { valid: boolean; error: NextResponse | null } {
  const missingFields = requiredFields.filter(
    (field) => body[field] === undefined || body[field] === null
  );
  
  if (missingFields.length > 0) {
    return {
      valid: false,
      error: createValidationError(
        'Missing required fields',
        missingFields as string[]
      ),
    };
  }
  
  return { valid: true, error: null };
}
