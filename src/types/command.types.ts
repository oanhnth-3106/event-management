// =====================================================================
// Command Types - Input/Output schemas for all commands
// =====================================================================
// Purpose: Type-safe command inputs and outputs
// Based on: SPECIFICATION.md Section 4.7 (Domain Commands)
// =====================================================================

import type { UserRole, EventStatus, RegistrationStatus } from './database.types';

/**
 * Base command result type
 * All commands return this structure for consistency
 */
export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: CommandError;
}

/**
 * Command error structure
 */
export interface CommandError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Domain event base type
 * Emitted by commands for event-driven architecture
 */
export interface DomainEvent {
  type: string;
  timestamp: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

// =====================================================================
// CMD-001: CreateEvent
// =====================================================================

export interface CreateEventInput {
  organizerId: string;
  title: string;
  description?: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  location: string;
  capacity: number;
  imageUrl?: string; // Optional image URL
  imageFile?: File; // Optional image upload
}

export interface CreateEventOutput {
  eventId: string;
  slug: string;
  status: EventStatus;
  imageUrl?: string;
  createdAt: string;
}

export const CreateEventErrors = {
  INVALID_TITLE_LENGTH: 'Title must be between 5 and 200 characters',
  INVALID_DATE_RANGE: 'End date must be after start date',
  START_DATE_IN_PAST: 'Start date must be in the future',
  UNAUTHORIZED: 'User must have organizer or admin role',
  IMAGE_UPLOAD_FAILED: 'Failed to upload event image',
} as const;

// =====================================================================
// CMD-002: ConfigureTicketType
// =====================================================================

export interface ConfigureTicketTypeInput {
  eventId: string;
  organizerId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  ticketTypeId?: string; // For updates
}

export interface ConfigureTicketTypeOutput {
  ticketTypeId: string;
  name: string;
  price: number;
  quantity: number;
  available: number;
}

export const ConfigureTicketTypeErrors = {
  EVENT_NOT_FOUND: 'Event does not exist',
  UNAUTHORIZED: 'Only event organizer can configure ticket types',
  INVALID_NAME_LENGTH: 'Name must be between 3 and 50 characters',
  INVALID_PRICE: 'Price must be non-negative',
  INVALID_QUANTITY: 'Quantity must be greater than 0',
  EXCEEDS_CAPACITY: 'Total ticket quantity exceeds event capacity',
  QUANTITY_BELOW_SOLD: 'Cannot reduce quantity below sold tickets',
} as const;

// =====================================================================
// CMD-003: PublishEvent
// =====================================================================

export interface PublishEventInput {
  eventId: string;
  organizerId: string;
}

export interface PublishEventOutput {
  eventId: string;
  status: EventStatus;
  publishedAt: string;
  slug: string;
}

export const PublishEventErrors = {
  EVENT_NOT_FOUND: 'Event does not exist',
  UNAUTHORIZED: 'Only event organizer can publish event',
  ALREADY_PUBLISHED: 'Event is already published',
  NO_TICKET_TYPES: 'Event must have at least one ticket type before publishing',
  EVENT_CANCELLED: 'Cannot publish cancelled event',
  START_DATE_PASSED: 'Cannot publish event that has already started',
} as const;

// =====================================================================
// CMD-004: RegisterForEvent
// =====================================================================

export interface RegisterForEventInput {
  eventId: string;
  userId: string;
  ticketTypeId: string;
}

export interface RegisterForEventOutput {
  registrationId: string;
  ticketCode: string;
  qrData: string;
  status: RegistrationStatus;
  eventDetails: {
    title: string;
    startDate: string;
    endDate: string;
    location: string;
  };
  ticketTypeDetails: {
    name: string;
    price: number;
  };
}

export const RegisterForEventErrors = {
  EVENT_NOT_FOUND: 'Event does not exist',
  EVENT_NOT_PUBLISHED: 'Event is not published',
  TICKET_TYPE_NOT_FOUND: 'Ticket type does not exist',
  CAPACITY_EXCEEDED: 'Event is at full capacity',
  TICKETS_SOLD_OUT: 'This ticket type is sold out',
  DUPLICATE_REGISTRATION: 'User is already registered for this ticket type',
  EVENT_ALREADY_STARTED: 'Cannot register for event that has already started',
  EVENT_CANCELLED: 'Cannot register for cancelled event',
} as const;

// =====================================================================
// CMD-005: GenerateTicketQRCode
// =====================================================================

export interface GenerateTicketQRCodeInput {
  eventId: string;
  registrationId: string;
  timestamp?: string; // Optional, defaults to now
}

export interface GenerateTicketQRCodeOutput {
  qrData: string;
  signature: string;
}

export const GenerateTicketQRCodeErrors = {
  MISSING_SECRET_KEY: 'QR_SECRET_KEY environment variable not set',
  REGISTRATION_NOT_FOUND: 'Registration does not exist',
} as const;

// =====================================================================
// CMD-006: CheckInTicket
// =====================================================================

export interface CheckInTicketInput {
  qrData: string;
  eventId: string;
  staffId: string;
  method: 'qr' | 'manual';
  location?: string;
  deviceInfo?: Record<string, unknown>;
}

export interface CheckInTicketOutput {
  checkInId: string;
  registration: {
    id: string;
    attendeeName: string;
    ticketType: string;
    checkedInAt: string;
  };
  message: string;
}

export const CheckInTicketErrors = {
  INVALID_QR_CODE: 'QR code is invalid or malformed',
  INVALID_SIGNATURE: 'QR code signature is invalid',
  EXPIRED_QR_CODE: 'QR code has expired',
  REGISTRATION_NOT_FOUND: 'Registration does not exist',
  WRONG_EVENT: 'This ticket is for a different event',
  ALREADY_CHECKED_IN: 'Ticket has already been checked in',
  REGISTRATION_CANCELLED: 'Registration has been cancelled',
  EVENT_NOT_STARTED: 'Event has not started yet (check-in window not open)',
  EVENT_ENDED: 'Event has ended (check-in window closed)',
  UNAUTHORIZED: 'Staff member is not assigned to this event',
} as const;

// =====================================================================
// CMD-007: ValidateQRSignature
// =====================================================================

export interface ValidateQRSignatureInput {
  qrData: string;
}

export interface ValidateQRSignatureOutput {
  isValid: boolean;
  eventId?: string;
  registrationId?: string;
  timestamp?: string;
}

export const ValidateQRSignatureErrors = {
  MALFORMED_QR_DATA: 'QR data format is invalid',
  MISSING_SECRET_KEY: 'QR_SECRET_KEY environment variable not set',
} as const;

// =====================================================================
// CMD-008: SendEventReminder
// =====================================================================

export interface SendEventReminderInput {
  eventId: string;
  reminderType: '24h' | '2h';
}

export interface SendEventReminderOutput {
  eventId: string;
  reminderType: '24h' | '2h';
  recipientCount: number;
  sentAt: string;
  emailsQueued: number;
}

export const SendEventReminderErrors = {
  EVENT_NOT_FOUND: 'Event does not exist',
  EVENT_NOT_PUBLISHED: 'Event is not published',
  ALREADY_SENT: 'Reminder of this type has already been sent',
  NO_REGISTRATIONS: 'Event has no confirmed registrations',
  EMAIL_SERVICE_ERROR: 'Failed to queue emails',
} as const;

// =====================================================================
// CMD-009: CancelEvent
// =====================================================================

export interface CancelEventInput {
  eventId: string;
  organizerId: string;
  reason?: string;
}

export interface CancelEventOutput {
  eventId: string;
  status: EventStatus;
  cancelledAt: string;
  affectedRegistrations: number;
}

export const CancelEventErrors = {
  EVENT_NOT_FOUND: 'Event does not exist',
  UNAUTHORIZED: 'Only event organizer can cancel event',
  ALREADY_CANCELLED: 'Event is already cancelled',
  ALREADY_COMPLETED: 'Cannot cancel completed event',
  EVENT_ENDED: 'Cannot cancel event that has already ended',
} as const;

// =====================================================================
// CMD-010: CancelRegistration
// =====================================================================

export interface CancelRegistrationInput {
  registrationId: string;
  userId: string;
  reason?: string;
}

export interface CancelRegistrationOutput {
  registrationId: string;
  status: RegistrationStatus;
  cancelledAt: string;
  refundEligible: boolean;
}

export const CancelRegistrationErrors = {
  REGISTRATION_NOT_FOUND: 'Registration does not exist',
  UNAUTHORIZED: 'User can only cancel their own registration',
  ALREADY_CANCELLED: 'Registration is already cancelled',
  ALREADY_CHECKED_IN: 'Cannot cancel registration after check-in',
  CANCELLATION_DEADLINE_PASSED: 'Cannot cancel within 1 hour of event start',
} as const;
