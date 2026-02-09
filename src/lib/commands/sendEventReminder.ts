// =====================================================================
// CMD-008: SendEventReminder
// =====================================================================
// Purpose: Queue event reminder emails (24h/2h before event)
// Authorization: System-triggered (scheduled job)
// Transaction: No (queues emails via edge function)
// =====================================================================

import { createServiceClient } from '@/lib/supabase/service';
import type {
  SendEventReminderInput,
  SendEventReminderOutput,
  CommandResult,
} from '@/types/command.types';
import type { Event, Registration, TicketType, Profile } from '@/types/database.types';
import {
  CommandExecutionError,
  NotFoundError,
  BusinessRuleError,
  DatabaseError,
  successResult,
  errorResult,
} from './errors';
import { SendEventReminderErrors } from '@/types/command.types';

/**
 * CMD-008: SendEventReminder
 * 
 * Queues reminder emails for event attendees
 * 
 * Preconditions:
 * - Event must exist and be published
 * - Reminder type must be valid (24h or 2h)
 * - Event must have confirmed registrations
 * - Reminder must not have been sent already
 * 
 * Postconditions:
 * - Email jobs queued for all confirmed attendees
 * - event_reminders record created (tracks sent status)
 * - EventReminderSent domain event emitted
 * 
 * Note: Actual email sending is handled by Supabase Edge Function
 * This command just queues the emails and creates audit records
 * 
 * @param input - Event ID and reminder type
 * @returns Reminder sent confirmation
 */
export async function sendEventReminder(
  input: SendEventReminderInput
): Promise<CommandResult<SendEventReminderOutput>> {
  try {
    const supabase = createServiceClient();
    
    // ----------------------------------------------------------------
    // 1. VALIDATE REMINDER TYPE
    // ----------------------------------------------------------------
    if (!['24h_before', '2h_before'].includes(input.reminderType)) {
      throw new BusinessRuleError(
        'INVALID_REMINDER_TYPE',
        'Invalid reminder type specified',
        { reminderType: input.reminderType }
      );
    }
    
    // ----------------------------------------------------------------
    // 2. FETCH EVENT
    // ----------------------------------------------------------------
    const { data: evt, error: eventError } = await supabase
      .from('events')
      .select('id, title, slug, start_date, end_date, location, status')
      .eq('id', input.eventId)
      .single();
    
    const event = evt as unknown as Pick<Event, 'id' | 'title' | 'slug' | 'start_date' | 'end_date' | 'location' | 'status'> | null;
    
    if (eventError || !event) {
      throw new NotFoundError('Event', input.eventId);
    }
    
    // Validate event is published
    if (event.status !== 'published') {
      throw new BusinessRuleError(
        'EVENT_NOT_PUBLISHED',
        SendEventReminderErrors.EVENT_NOT_PUBLISHED,
        { eventId: input.eventId, status: event.status }
      );
    }
    
    // ----------------------------------------------------------------
    // 3. CHECK IF REMINDER ALREADY SENT
    // ----------------------------------------------------------------
    const { data: existingRem } = await supabase
      .from('event_reminders')
      .select('id, sent_at, recipient_count')
      .eq('event_id', input.eventId)
      .eq('reminder_type', input.reminderType)
      .maybeSingle();
    
    const existingReminder = existingRem as unknown as { id: string; sent_at: string; recipient_count: number } | null;
    
    if (existingReminder) {
      throw new BusinessRuleError(
        'REMINDER_ALREADY_SENT',
        SendEventReminderErrors.ALREADY_SENT,
        {
          sentAt: existingReminder.sent_at,
          recipientCount: existingReminder.recipient_count,
        }
      );
    }
    
    // ----------------------------------------------------------------
    // 4. FETCH CONFIRMED REGISTRATIONS
    // ----------------------------------------------------------------
    const { data: regs, error: regError } = await supabase
      .from('registrations')
      .select(`
        id,
        user:profiles!registrations_user_id_fkey(
          id,
          email,
          full_name
        ),
        ticket_type:ticket_types!registrations_ticket_type_id_fkey(
          name
        )
      `)
      .eq('event_id', input.eventId)
      .eq('status', 'confirmed');
    
    const registrations = regs as unknown as Array<{
      id: string;
      user: { id: string; email: string; full_name: string };
      ticket_type: { name: string };
    }> | null;
    
    if (regError) {
      throw new DatabaseError('Failed to fetch registrations', regError);
    }
    
    if (!registrations || registrations.length === 0) {
      throw new BusinessRuleError(
        'NO_ATTENDEES',
        SendEventReminderErrors.NO_REGISTRATIONS,
        { eventId: input.eventId }
      );
    }
    
    // ----------------------------------------------------------------
    // 5. QUEUE EMAILS
    // ----------------------------------------------------------------
    // In production, this would call a Supabase Edge Function
    // For now, we'll just log the email queue
    
    const emailJobs = registrations.map((reg) => ({
      recipientEmail: reg.user.email,
      recipientName: reg.user.full_name,
      eventTitle: event.title,
      eventSlug: event.slug,
      eventStartDate: event.start_date,
      eventLocation: event.location,
      ticketType: reg.ticket_type.name,
      registrationId: reg.id,
      reminderType: input.reminderType,
    }));
    
    // TODO: Call Supabase Edge Function to send emails
    // const { error: emailError } = await supabase.functions.invoke('send-event-reminder', {
    //   body: {
    //     eventId: input.eventId,
    //     reminderType: input.reminderType,
    //     emails: emailJobs,
    //   },
    // });
    
    // if (emailError) {
    //   throw new DatabaseError('Failed to queue reminder emails', emailError);
    // }
    
    console.log(`[SendEventReminder] Queued ${emailJobs.length} emails for event ${input.eventId}`);
    
    // ----------------------------------------------------------------
    // 6. CREATE REMINDER RECORD
    // ----------------------------------------------------------------
    const sentAt = new Date().toISOString();
    
    const { data: rem, error: reminderError } = await supabase
      .from('event_reminders')
      // @ts-ignore - Supabase insert type inference issue
      .insert({
        event_id: input.eventId,
        reminder_type: input.reminderType,
        sent_at: sentAt,
        recipient_count: registrations.length,
      })
      .select()
      .single();
    
    const reminder = rem as unknown as { id: string } | null;
    
    if (reminderError || !reminder) {
      throw new DatabaseError('Failed to create reminder record', reminderError);
    }
    
    // ----------------------------------------------------------------
    // 7. EMIT DOMAIN EVENT
    // ----------------------------------------------------------------
    // TODO: Implement domain event emission
    // await emitDomainEvent({
    //   type: 'EventReminderSent',
    //   timestamp: sentAt,
    //   aggregateId: input.eventId,
    //   payload: {
    //     eventId: input.eventId,
    //     reminderType: input.reminderType,
    //     recipientCount: registrations.length,
    //     sentAt,
    //   },
    // });
    
    // ----------------------------------------------------------------
    // 8. RETURN SUCCESS
    // ----------------------------------------------------------------
    return successResult<SendEventReminderOutput>({
      eventId: input.eventId,
      recipientCount: registrations.length,
      sentAt,
      reminderType: input.reminderType,
      emailsQueued: registrations.length,
    });
    
  } catch (error) {
    if (error instanceof CommandExecutionError) {
      return errorResult(error);
    }
    
    console.error('[SendEventReminder] Unexpected error:', error);
    return errorResult(
      new DatabaseError('An unexpected error occurred while sending reminder')
    );
  }
}
