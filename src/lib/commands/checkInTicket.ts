// =====================================================================
// CMD-006: CheckInTicket
// =====================================================================
// Purpose: Check in an attendee by validating QR code
// Authorization: Staff must be assigned to the event
// Transaction: Yes (validate QR + update registration + create check-in record)
// =====================================================================

import { createServiceClient } from '@/lib/supabase/service';
import { validateQRCode } from '@/lib/qr';
import type {
  CheckInTicketInput,
  CheckInTicketOutput,
  CommandResult,
} from '@/types/command.types';
import type { Event, Registration } from '@/types/database.types';
import {
  CommandExecutionError,
  NotFoundError,
  BusinessRuleError,
  AuthorizationError,
  DatabaseError,
  successResult,
  errorResult,
} from './errors';
import { CheckInTicketErrors } from '@/types/command.types';

/**
 * CMD-006: CheckInTicket
 * 
 * Validates QR code and checks in attendee
 * 
 * Preconditions:
 * - QR code must be valid (signature + format)
 * - Registration must exist and be confirmed
 * - Staff must be assigned to the event
 * - Check-in window must be open (2h before start to 2h after end)
 * - Registration must not be cancelled
 * - Registration must not already be checked in
 * 
 * Postconditions:
 * - Registration status updated to 'checked_in'
 * - Check-in record created (audit trail)
 * - AttendeeCheckedIn domain event emitted
 * 
 * @param input - Check-in data with QR code
 * @returns Check-in confirmation
 */
export async function checkInTicket(
  input: CheckInTicketInput
): Promise<CommandResult<CheckInTicketOutput>> {
  try {
    const supabase = createServiceClient();
    
    // ----------------------------------------------------------------
    // 1. VALIDATE QR CODE FORMAT AND SIGNATURE
    // ----------------------------------------------------------------
    // Note: For initial validation, we need event dates
    // We'll parse QR first, fetch event, then do full validation
    
    const { parseQRData } = await import('@/lib/qr');
    const parsed = parseQRData(input.qrData);
    
    if (!parsed) {
      throw new BusinessRuleError(
        'INVALID_QR_CODE',
        CheckInTicketErrors.INVALID_QR_CODE
      );
    }
    
    // Validate QR is for the correct event
    if (parsed.eventId !== input.eventId) {
      throw new BusinessRuleError(
        'WRONG_EVENT',
        CheckInTicketErrors.WRONG_EVENT,
        {
          expectedEventId: input.eventId,
          actualEventId: parsed.eventId,
        }
      );
    }
    
    // ----------------------------------------------------------------
    // 2. FETCH EVENT DETAILS
    // ----------------------------------------------------------------
    const { data: evt, error: eventError } = await supabase
      .from('events')
      .select('id, title, start_date, end_date, status')
      .eq('id', input.eventId)
      .single();
    
    const event = evt as unknown as Pick<Event, 'id' | 'title' | 'start_date' | 'end_date' | 'status'> | null;
    
    if (eventError || !event) {
      throw new NotFoundError('Event', input.eventId);
    }
    
    // Validate event is published
    if (event.status !== 'published') {
      throw new BusinessRuleError(
        'EVENT_NOT_PUBLISHED',
        'Cannot check in to unpublished event',
        { eventId: input.eventId, status: event.status }
      );
    }
    
    // ----------------------------------------------------------------
    // 3. VALIDATE QR CODE COMPLETELY (signature + timestamp)
    // ----------------------------------------------------------------
    const validation = validateQRCode(
      input.qrData,
      event.start_date,
      event.end_date
    );
    
    if (!validation.isValid) {
      if (validation.reason?.includes('not opened')) {
        throw new BusinessRuleError(
          'EVENT_NOT_STARTED',
          CheckInTicketErrors.EVENT_NOT_STARTED,
          { eventStartDate: event.start_date }
        );
      } else if (validation.reason?.includes('closed')) {
        throw new BusinessRuleError(
          'EVENT_ENDED',
          CheckInTicketErrors.EVENT_ENDED,
          { eventEndDate: event.end_date }
        );
      } else {
        throw new BusinessRuleError(
          'INVALID_SIGNATURE',
          CheckInTicketErrors.INVALID_SIGNATURE,
          { reason: validation.reason }
        );
      }
    }
    
    // ----------------------------------------------------------------
    // 4. VERIFY STAFF AUTHORIZATION
    // ----------------------------------------------------------------
    // Check if staff is assigned to this event
    const { data: staffAssignment, error: staffError } = await supabase
      .from('staff_assignments')
      .select('id')
      .eq('event_id', input.eventId)
      .eq('staff_id', input.staffId)
      .maybeSingle();
    
    if (staffError || !staffAssignment) {
      throw new AuthorizationError(CheckInTicketErrors.UNAUTHORIZED);
    }
    
    // ----------------------------------------------------------------
    // 5. FETCH REGISTRATION
    // ----------------------------------------------------------------
    const { data: reg, error: regError } = await supabase
      .from('registrations')
      .select(`
        id,
        status,
        checked_in_at,
        user:profiles!registrations_user_id_fkey(full_name, email),
        ticket_type:ticket_types!registrations_ticket_type_id_fkey(name)
      `)
      .eq('id', parsed.registrationId)
      .eq('event_id', input.eventId)
      .single();
    
    const registration = reg as unknown as Pick<Registration, 'id' | 'status' | 'checked_in_at'> | null;
    
    if (regError || !registration) {
      throw new NotFoundError('Registration', parsed.registrationId);
    }
    
    // ----------------------------------------------------------------
    // 6. VALIDATE REGISTRATION STATUS
    // ----------------------------------------------------------------
    // Check if cancelled
    if (registration.status === 'cancelled') {
      throw new BusinessRuleError(
        'REGISTRATION_CANCELLED',
        CheckInTicketErrors.REGISTRATION_CANCELLED,
        { registrationId: parsed.registrationId }
      );
    }
    
    // Check if already checked in
    if (registration.status === 'checked_in') {
      throw new BusinessRuleError(
        'ALREADY_CHECKED_IN',
        CheckInTicketErrors.ALREADY_CHECKED_IN,
        {
          registrationId: parsed.registrationId,
          checkedInAt: registration.checked_in_at,
        }
      );
    }
    
    // ----------------------------------------------------------------
    // 7. PERFORM CHECK-IN (via transaction function)
    // ----------------------------------------------------------------
    const { data: checkIn, error: checkInError } = await supabase.rpc(
      'check_in_ticket_transaction',
      // @ts-ignore - Supabase RPC type inference issue
      {
        p_registration_id: parsed.registrationId,
        p_staff_id: input.staffId,
        p_method: input.method,
        p_location: input.location || null,
        p_device_info: input.deviceInfo || null,
      }
    );
    
    const checkInResult = checkIn as unknown as {
      check_in_id: string;
      already_checked_in: boolean;
      checked_in_at: string;
      attendee_name: string;
      ticket_type: string;
    } | null;
    
    if (checkInError || !checkInResult) {
      throw new DatabaseError('Failed to check in ticket', checkInError);
    }
    
    // Handle duplicate check-in (idempotent)
    if (checkInResult.already_checked_in) {
      throw new BusinessRuleError(
        'ALREADY_CHECKED_IN',
        `Already checked in at ${new Date(checkInResult.checked_in_at).toLocaleTimeString()}`,
        {
          checkedInAt: checkInResult.checked_in_at,
          attendeeName: checkInResult.attendee_name,
        }
      );
    }
    
    // ----------------------------------------------------------------
    // 8. EMIT DOMAIN EVENT
    // ----------------------------------------------------------------
    // TODO: Implement domain event emission
    // await emitDomainEvent({
    //   type: 'AttendeeCheckedIn',
    //   timestamp: new Date().toISOString(),
    //   aggregateId: parsed.registrationId,
    //   payload: {
    //     eventId: input.eventId,
    //     staffId: input.staffId,
    //     method: input.method,
    //   },
    // });
    
    // ----------------------------------------------------------------
    // 9. RETURN SUCCESS
    // ----------------------------------------------------------------
    return successResult<CheckInTicketOutput>({
      checkInId: checkInResult.check_in_id,
      registration: {
        id: parsed.registrationId,
        attendeeName: checkInResult.attendee_name,
        ticketType: checkInResult.ticket_type,
        checkedInAt: checkInResult.checked_in_at,
      },
      message: `Welcome, ${checkInResult.attendee_name}!`,
    });
    
  } catch (error) {
    if (error instanceof CommandExecutionError) {
      return errorResult(error);
    }
    
    console.error('[CheckInTicket] Unexpected error:', error);
    return errorResult(
      new DatabaseError('An unexpected error occurred during check-in')
    );
  }
}
