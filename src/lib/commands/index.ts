// =====================================================================
// Command Layer - Barrel Export
// =====================================================================
// Exports all domain commands for the Event Management system
//
// Usage:
//   import { createEvent, registerForEvent } from '@/lib/commands';
//
// All commands follow the SpecKit pattern:
//   - Input validation
//   - Authorization checks
//   - Business rule enforcement
//   - Database operations (via service client)
//   - Domain event emission
//   - Structured result (success/error)
// =====================================================================

// Command implementations
export { createEvent } from './createEvent';
export { configureTicketType } from './configureTicketType';
export { publishEvent } from './publishEvent';
export { registerForEvent } from './registerForEvent';
export { checkInTicket } from './checkInTicket';
export { sendEventReminder } from './sendEventReminder';
export { cancelEvent } from './cancelEvent';
export { cancelRegistration } from './cancelRegistration';

// Error classes
export {
  CommandExecutionError,
  ValidationError,
  AuthorizationError,
  BusinessRuleError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  successResult,
  errorResult,
} from './errors';

// Re-export types for convenience
export type {
  CommandResult,
  DomainEvent,
  // CMD-001
  CreateEventInput,
  CreateEventOutput,
  // CMD-002
  ConfigureTicketTypeInput,
  ConfigureTicketTypeOutput,
  // CMD-003
  PublishEventInput,
  PublishEventOutput,
  // CMD-004
  RegisterForEventInput,
  RegisterForEventOutput,
  // CMD-005 (integrated into CMD-004)
  GenerateTicketQRCodeInput,
  GenerateTicketQRCodeOutput,
  // CMD-006
  CheckInTicketInput,
  CheckInTicketOutput,
  // CMD-007 (integrated into QR utils)
  ValidateQRSignatureInput,
  ValidateQRSignatureOutput,
  // CMD-008
  SendEventReminderInput,
  SendEventReminderOutput,
  // CMD-009
  CancelEventInput,
  CancelEventOutput,
  // CMD-010
  CancelRegistrationInput,
  CancelRegistrationOutput,
} from '@/types/command.types';
