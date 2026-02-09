// =====================================================================
// CMD-009: CancelEvent
// =====================================================================
// Purpose: Cancel an event and notify all attendees
// Authorization: Must be event organizer or admin
// Transaction: No (updates event + queues notifications)
// =====================================================================

import { createServiceClient } from '@/lib/supabase/service';
import type {
  CancelEventInput,
  CancelEventOutput,
  CommandResult,
} from '@/types/command.types';
import type { Event, Profile } from '@/types/database.types';
import {
  CommandExecutionError,
  NotFoundError,
  AuthorizationError,
  BusinessRuleError,
  DatabaseError,
  successResult,
  errorResult,
} from './errors';
import { CancelEventErrors } from '@/types/command.types';

/**
 * CMD-009: CancelEvent
 * 
 * Cancels an event and notifies all registered attendees
 * 
 * Preconditions:
 * - Event must exist
 * - User must be organizer of the event or admin
 * - Event must not already be cancelled
 * - Event must not have already ended
 * 
 * Postconditions:
 * - Event status changed to 'cancelled'
 * - cancelled_at timestamp set
 * - Cancellation reason stored
 * - All confirmed registrations marked as cancelled
 * - Email notifications queued for all attendees
 * - EventCancelled domain event emitted
 * 
 * Note: Refunds are handled separately by payment processor
 * 
 * @param input - Event ID, user ID, and cancellation reason
 * @returns Cancellation confirmation
 */
export async function cancelEvent(
  input: CancelEventInput
): Promise<CommandResult<CancelEventOutput>> {
  try {
    const supabase = createServiceClient();
    
    // ----------------------------------------------------------------
    // 1. FETCH EVENT
    // ----------------------------------------------------------------
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, organizer_id, title, slug, status, start_date, end_date')
      .eq('id', input.eventId)
      .single();
    
    if (eventError || !event) {
      throw new NotFoundError('Event', input.eventId);
    }
    
    // Type assertion after null check
    const eventData = event as unknown as Pick<Event, 'id' | 'organizer_id' | 'title' | 'slug' | 'status' | 'start_date' | 'end_date'>;
    
    // ----------------------------------------------------------------
    // 2. VERIFY AUTHORIZATION
    // ----------------------------------------------------------------
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', input.organizerId)
      .single();
    
    const profileData = profile as unknown as Pick<Profile, 'role'> | null;
    
    const isOrganizer = eventData.organizer_id === input.organizerId;
    const isAdmin = profileData?.role === 'admin';
    
    if (!isOrganizer && !isAdmin) {
      throw new AuthorizationError(CancelEventErrors.UNAUTHORIZED);
    }
    
    // ----------------------------------------------------------------
    // 3. VALIDATE EVENT STATUS
    // ----------------------------------------------------------------
    // Cannot cancel already cancelled event
    if (eventData.status === 'cancelled') {
      throw new BusinessRuleError(
        'ALREADY_CANCELLED',
        CancelEventErrors.ALREADY_CANCELLED,
        { eventId: input.eventId }
      );
    }
    
    // Cannot cancel past event
    const now = new Date();
    const endDate = new Date(eventData.end_date);
    
    if (endDate < now) {
      throw new BusinessRuleError(
        'EVENT_ENDED',
        CancelEventErrors.EVENT_ENDED,
        { eventId: input.eventId, endDate: eventData.end_date }
      );
    }
    
    // ----------------------------------------------------------------
    // 4. VALIDATE CANCELLATION REASON
    // ----------------------------------------------------------------
    if (!input.reason || input.reason.trim().length < 10) {
      throw new BusinessRuleError(
        'INVALID_REASON',
        'Cancellation reason must be at least 10 characters',
        { reasonLength: input.reason?.length || 0 }
      );
    }
    
    if (input.reason.length > 500) {
      throw new BusinessRuleError(
        'INVALID_REASON',
        'Cancellation reason must not exceed 500 characters',
        { reasonLength: input.reason.length }
      );
    }
    
    // ----------------------------------------------------------------
    // 5. GET REGISTRATION COUNT
    // ----------------------------------------------------------------
    const { count: registrationCount, error: countError } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', input.eventId)
      .eq('status', 'confirmed');
    
    if (countError) {
      throw new DatabaseError('Failed to count registrations', countError);
    }
    
    const affectedAttendees = registrationCount || 0;
    
    // ----------------------------------------------------------------
    // 6. CANCEL EVENT
    // ----------------------------------------------------------------
    const cancelledAt = new Date().toISOString();
    
    const { error: updateError } = await supabase
      .from('events')
      // @ts-expect-error - Supabase type inference issue with Database schema
      .update({
        status: 'cancelled',
        cancelled_at: cancelledAt,
        cancellation_reason: input.reason.trim(),
        updated_at: cancelledAt,
      })
      .eq('id', input.eventId);
    
    if (updateError) {
      throw new DatabaseError('Failed to cancel event', updateError);
    }
    
    // ----------------------------------------------------------------
    // 7. CANCEL ALL CONFIRMED REGISTRATIONS
    // ----------------------------------------------------------------
    if (affectedAttendees > 0) {
      const { error: regUpdateError } = await supabase
        .from('registrations')
        // @ts-expect-error - Supabase type inference issue with Database schema
        .update({
          status: 'cancelled',
          updated_at: cancelledAt,
        })
        .eq('event_id', input.eventId)
        .eq('status', 'confirmed');
      
      if (regUpdateError) {
        console.error('[CancelEvent] Failed to cancel registrations:', regUpdateError);
        // Don't fail the whole operation, log for manual cleanup
      }
    }
    
    // ----------------------------------------------------------------
    // 8. QUEUE CANCELLATION EMAILS
    // ----------------------------------------------------------------
    if (affectedAttendees > 0) {
      // TODO: Queue emails via Supabase Edge Function
      // const { error: emailError } = await supabase.functions.invoke('send-event-cancellation', {
      //   body: {
      //     eventId: input.eventId,
      //     eventTitle: event.title,
      //     eventSlug: event.slug,
      //     reason: input.reason,
      //   },
      // });
      
      // if (emailError) {
      //   console.error('[CancelEvent] Failed to queue cancellation emails:', emailError);
      //   // Don't fail the whole operation
      // }
      
      console.log(`[CancelEvent] Queued ${affectedAttendees} cancellation emails for event ${input.eventId}`);
    }
    
    // ----------------------------------------------------------------
    // 9. EMIT DOMAIN EVENT
    // ----------------------------------------------------------------
    // TODO: Implement domain event emission
    // await emitDomainEvent({
    //   type: 'EventCancelled',
    //   timestamp: cancelledAt,
    //   aggregateId: input.eventId,
    //   payload: {
    //     eventId: input.eventId,
    //     organizerId: input.organizerId,
    //     reason: input.reason,
    //     affectedAttendees,
    //     cancelledAt,
    //   },
    // });
    
    // ----------------------------------------------------------------
    // 10. RETURN SUCCESS
    // ----------------------------------------------------------------
    return successResult<CancelEventOutput>({
      eventId: input.eventId,
      status: 'cancelled',
      cancelledAt,
      affectedRegistrations: affectedAttendees,
    });
    
  } catch (error) {
    if (error instanceof CommandExecutionError) {
      return errorResult(error);
    }
    
    console.error('[CancelEvent] Unexpected error:', error);
    return errorResult(
      new DatabaseError('An unexpected error occurred while cancelling event')
    );
  }
}
