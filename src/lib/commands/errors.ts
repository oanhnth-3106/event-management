// =====================================================================
// Command Errors - Custom error classes for domain commands
// =====================================================================

import type { CommandError } from '@/types/command.types';

/**
 * Base command error class
 * All domain command errors extend this
 */
export class CommandExecutionError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CommandExecutionError';
    this.code = code;
    this.details = details;
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CommandExecutionError);
    }
  }

  /**
   * Convert to CommandError format for API responses
   */
  toCommandError(): CommandError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Validation error - input data is invalid
 */
export class ValidationError extends CommandExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authorization error - user lacks permission
 */
export class AuthorizationError extends CommandExecutionError {
  constructor(message: string = 'Unauthorized access') {
    super('UNAUTHORIZED', message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Business rule violation error
 */
export class BusinessRuleError extends CommandExecutionError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
    this.name = 'BusinessRuleError';
  }
}

/**
 * Not found error - entity doesn't exist
 */
export class NotFoundError extends CommandExecutionError {
  constructor(entity: string, id?: string) {
    const message = id 
      ? `${entity} with id '${id}' not found`
      : `${entity} not found`;
    super(`${entity.toUpperCase()}_NOT_FOUND`, message);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error - operation conflicts with current state
 */
export class ConflictError extends CommandExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT', message, details);
    this.name = 'ConflictError';
  }
}

/**
 * Database error wrapper
 */
export class DatabaseError extends CommandExecutionError {
  constructor(message: string, originalError?: unknown) {
    super('DATABASE_ERROR', message, { originalError });
    this.name = 'DatabaseError';
  }
}

/**
 * Helper to create command result from error
 */
export function errorResult(error: CommandExecutionError) {
  return {
    success: false as const,
    error: error.toCommandError(),
  };
}

/**
 * Helper to create successful command result
 */
export function successResult<T>(data: T) {
  return {
    success: true as const,
    data,
  };
}
