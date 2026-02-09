// =====================================================================
// CMD-010: CancelRegistration
// =====================================================================
// Purpose: Cancel a registration and restore ticket availability
// Authorization: User can cancel their own registration or organizer/admin can cancel any
// Transaction: Yes (update registration + increment ticket availability)
// =====================================================================

import { createServiceClient } from '@/lib/supabase/service';
import type {
  CancelRegistrationInput,
  CancelRegistrationOutput,
  CommandResult,
} from '@/types/command.types';
import type { Event, Profile, Registration, TicketType } from '@/types/database.types';
import {
  CommandExecutionError,
  NotFoundError,
  AuthorizationError,
  BusinessRuleError,
  DatabaseError,
  successResult,
  errorResult,
} from './errors';
import { CancelRegistrationErrors } from '@/types/command.types';

/**
 * CMD-010: CancelRegistration
 * 
 * Cancels a registration and restores ticket availability
 * 
 * Preconditions:
 * - Registration must exist
 * - User must own the registration OR be event organizer OR be admin
 * - Registration must not already be cancelled
 * - Event must not have ended (cannot cancel after event ends)
 * - Cannot cancel after check-in
 * 
 * Postconditions:
 * - Registration status changed to 'cancelled'
 * - Ticket availability incremented
 * - Cancellation email sent
 * - RegistrationCancelled domain event emitted
 * - Refund initiated (if applicable)
 * 
 * @param input - Registration ID and user ID
 * @returns Cancellation confirmation
 */
export async function cancelRegistration(
  input: CancelRegistrationInput
): Promise<CommandResult<CancelRegistrationOutput>> {
  try {
    const supabase = createServiceClient();
    
    // ----------------------------------------------------------------
    // 1. FETCH REGISTRATION WITH EVENT
    // ----------------------------------------------------------------
    const { data: reg, error: regError } = await supabase
      .from('registrations')
      .select(`
        id,
        user_id,
        event_id,
        ticket_type_id,
        status,
        checked_in_at,
        event:events!registrations_event_id_fkey(
          id,
          title,
          slug,
          organizer_id,
          end_date,
          status
        ),
        ticket_type:ticket_types!registrations_ticket_type_id_fkey(
          id,
          name,
          price
        )
      `)
      .eq('id', input.registrationId)
      .single();
    
    const registration = reg as unknown as (Pick<Registration, 'id' | 'user_id' | 'event_id' | 'ticket_type_id' | 'status' | 'checked_in_at'> & {
      event: Pick<Event, 'id' | 'title' | 'slug' | 'organizer_id' | 'end_date' | 'status'>;
      ticket_type: Pick<TicketType, 'id' | 'name' | 'price'>;
    }) | null;
    
    if (regError || !registration) {
      throw new NotFoundError('Registration', input.registrationId);
    }
    
    // ----------------------------------------------------------------
    // 2. VERIFY AUTHORIZATION
    // ----------------------------------------------------------------
    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', input.userId)
      .single();
    
    const profile = prof as unknown as Pick<Profile, 'role'> | null;
    
    const isOwner = registration.user_id === input.userId;
    const isOrganizer = registration.event.organizer_id === input.userId;
    const isAdmin = profile?.role === 'admin';
    
    if (!isOwner && !isOrganizer && !isAdmin) {
      throw new AuthorizationError(CancelRegistrationErrors.UNAUTHORIZED);
    }
    
    // ----------------------------------------------------------------
    // 3. VALIDATE REGISTRATION STATUS
    // ----------------------------------------------------------------
    // Cannot cancel already cancelled registration
    if (registration.status === 'cancelled') {
      throw new BusinessRuleError(
        'ALREADY_CANCELLED',
        CancelRegistrationErrors.ALREADY_CANCELLED,
        { registrationId: input.registrationId }
      );
    }
    
    // Cannot cancel after check-in
    if (registration.status === 'checked_in' || registration.checked_in_at) {
      throw new BusinessRuleError(
        'ALREADY_CHECKED_IN',
        CancelRegistrationErrors.ALREADY_CHECKED_IN,
        { registrationId: input.registrationId, checkedInAt: registration.checked_in_at }
      );
    }
    
    // ----------------------------------------------------------------
    // 4. VALIDATE EVENT STATUS
    // ----------------------------------------------------------------
    // Cannot cancel if event already ended
    const now = new Date();
    const endDate = new Date(registration.event.end_date);
    
    if (endDate < now) {
      throw new BusinessRuleError(
        'EVENT_ENDED',
        'Cannot cancel registration after event has ended',
        { eventEndDate: registration.event.end_date }
      );
    }
    
    // Cannot cancel if event is cancelled
    if (registration.event.status === 'cancelled') {
      throw new BusinessRuleError(
        'EVENT_CANCELLED',
        'Cannot cancel registration for cancelled event (already cancelled)',
        { eventId: registration.event_id }
      );
    }
    
    // ----------------------------------------------------------------
    // 5. CANCEL REGISTRATION (via transaction function)
    // ----------------------------------------------------------------
    const { data: cancelRes, error: cancelError } = await supabase.rpc(
      'cancel_registration_transaction',
      // @ts-ignore - Supabase RPC type inference issue
      {
        p_registration_id: input.registrationId,
      }
    );
    
    const cancelResult = cancelRes as unknown as {
      already_cancelled: boolean;
      cancelled_at: string;
    } | null;
    
    if (cancelError || !cancelResult) {
      throw new DatabaseError('Failed to cancel registration', cancelError);
    }
    
    // Handle already cancelled (idempotent)
    if (cancelResult.already_cancelled) {
      throw new BusinessRuleError(
        'ALREADY_CANCELLED',
        CancelRegistrationErrors.ALREADY_CANCELLED,
        { registrationId: input.registrationId }
      );
    }
    
    // ----------------------------------------------------------------
    // 6. SEND CANCELLATION EMAIL
    // ----------------------------------------------------------------
    const { error: emailError } = await supabase.functions.invoke('send-cancellation-confirmation', {
      body: {
        registrationId: input.registrationId,
        eventTitle: registration.event.title,
        eventSlug: registration.event.slug,
        ticketType: registration.ticket_type.name,
        refundAmount: registration.ticket_type.price,
      },
    });
    
    if (emailError) {
      console.error('[CancelRegistration] Failed to send cancellation email:', emailError);
      // Don't fail the whole operation
    }
    
    // ----------------------------------------------------------------
    // 7. INITIATE REFUND
    // ----------------------------------------------------------------
    // TODO: Integrate with payment processor for refund
    // const refundAmount = registration.ticket_type.price;
    // if (refundAmount > 0) {
    //   const { error: refundError } = await initiateRefund({
    //     registrationId: input.registrationId,
    //     amount: refundAmount,
    //   });
    
    //   if (refundError) {
    //     console.error('[CancelRegistration] Refund initiation failed:', refundError);
    //     // Log for manual processing
    //   }
    // }
    
    // ----------------------------------------------------------------
    // 8. EMIT DOMAIN EVENT
    // ----------------------------------------------------------------
    // TODO: Implement domain event emission
    // await emitDomainEvent({
    //   type: 'RegistrationCancelled',
    //   timestamp: cancelResult.cancelled_at,
    //   aggregateId: input.registrationId,
    //   payload: {
    //     registrationId: input.registrationId,
    //     eventId: registration.event_id,
    //     userId: registration.user_id,
    //     ticketTypeId: registration.ticket_type_id,
    //     cancelledAt: cancelResult.cancelled_at,
    //   },
    // });
    
    // ----------------------------------------------------------------
    // 9. RETURN SUCCESS
    // ----------------------------------------------------------------
    return successResult<CancelRegistrationOutput>({
      registrationId: input.registrationId,
      status: 'cancelled',
      cancelledAt: cancelResult.cancelled_at,
      refundEligible: registration.ticket_type.price > 0,
    });
    
  } catch (error) {
    if (error instanceof CommandExecutionError) {
      return errorResult(error);
    }
    
    console.error('[CancelRegistration] Unexpected error:', error);
    return errorResult(
      new DatabaseError('An unexpected error occurred while cancelling registration')
    );
  }
}
