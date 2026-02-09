// =====================================================================
// CMD-003: PublishEvent
// =====================================================================
// Purpose: Transition event from draft to published status
// Authorization: Must be event organizer or admin
// Transaction: No (single update with validation)
// =====================================================================

import { createServiceClient } from '@/lib/supabase/service';
import type {
  PublishEventInput,
  PublishEventOutput,
  CommandResult,
} from '@/types/command.types';
import type { Event, Profile, TicketType } from '@/types/database.types';
import {
  CommandExecutionError,
  NotFoundError,
  AuthorizationError,
  BusinessRuleError,
  DatabaseError,
  successResult,
  errorResult,
} from './errors';
import { PublishEventErrors } from '@/types/command.types';

/**
 * CMD-003: PublishEvent
 * 
 * Publishes a draft event, making it visible to attendees
 * 
 * Preconditions:
 * - Event must exist
 * - User must be organizer of the event or admin
 * - Event must be in draft status
 * - Event must have at least one ticket type configured
 * - Event start date must be in the future
 * - All required fields must be filled
 * 
 * Postconditions:
 * - Event status changed to 'published'
 * - published_at timestamp set
 * - EventPublished domain event emitted
 * - Event becomes visible in public listings
 * 
 * @param input - Event ID and user ID
 * @returns Published event details
 */
export async function publishEvent(
  input: PublishEventInput
): Promise<CommandResult<PublishEventOutput>> {
  try {
    const supabase = createServiceClient();
    
    // ----------------------------------------------------------------
    // 1. FETCH EVENT WITH TICKET TYPES
    // ----------------------------------------------------------------
    const { data: evt, error: eventError } = await supabase
      .from('events')
      .select(`
        id,
        organizer_id,
        title,
        description,
        start_date,
        end_date,
        location,
        capacity,
        status,
        ticket_types(id, name, price, quantity)
      `)
      .eq('id', input.eventId)
      .single();
    
    const event = evt as unknown as (Pick<Event, 'id' | 'organizer_id' | 'title' | 'description' | 'start_date' | 'end_date' | 'location' | 'capacity' | 'status'> & {
      ticket_types: Pick<TicketType, 'id' | 'name' | 'price' | 'quantity'>[];
    }) | null;
    
    if (eventError || !event) {
      throw new NotFoundError('Event', input.eventId);
    }
    
    // ----------------------------------------------------------------
    // 2. VERIFY AUTHORIZATION
    // ----------------------------------------------------------------
    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', input.organizerId)
      .single();
    
    const profile = prof as unknown as Pick<Profile, 'role'> | null;
    
    const isOrganizer = event.organizer_id === input.organizerId;
    const isAdmin = profile?.role === 'admin';
    
    if (!isOrganizer && !isAdmin) {
      throw new AuthorizationError(PublishEventErrors.UNAUTHORIZED);
    }
    
    // ----------------------------------------------------------------
    // 3. VALIDATE EVENT STATUS
    // ----------------------------------------------------------------
    if (event.status !== 'draft') {
      throw new BusinessRuleError(
        'ALREADY_PUBLISHED',
        PublishEventErrors.ALREADY_PUBLISHED,
        { eventId: input.eventId, status: event.status }
      );
    }
    
    // ----------------------------------------------------------------
    // 4. VALIDATE EVENT COMPLETENESS
    // ----------------------------------------------------------------
    const validationErrors: string[] = [];
    
    // Check required fields
    if (!event.title || event.title.trim().length === 0) {
      validationErrors.push('Title is required');
    }
    if (!event.description || event.description.trim().length === 0) {
      validationErrors.push('Description is required');
    }
    if (!event.location || event.location.trim().length === 0) {
      validationErrors.push('Location is required');
    }
    if (!event.start_date) {
      validationErrors.push('Start date is required');
    }
    if (!event.end_date) {
      validationErrors.push('End date is required');
    }
    
    // Check start date is in the future
    if (event.start_date) {
      const startDate = new Date(event.start_date);
      const now = new Date();
      
      if (startDate <= now) {
        validationErrors.push('Event start date must be in the future');
      }
    }
    
    // Check ticket types
    if (!event.ticket_types || event.ticket_types.length === 0) {
      throw new BusinessRuleError(
        'NO_TICKET_TYPES',
        PublishEventErrors.NO_TICKET_TYPES,
        { eventId: input.eventId }
      );
    }
    
    if (validationErrors.length > 0) {
      throw new BusinessRuleError(
        'INCOMPLETE_EVENT',
        'Event is incomplete: ' + validationErrors.join('; '),
        { validationErrors }
      );
    }
    
    // ----------------------------------------------------------------
    // 5. PUBLISH EVENT
    // ----------------------------------------------------------------
    const publishedAt = new Date().toISOString();
    
    const { data: pubEvent, error: publishError } = await supabase
      .from('events')
      // @ts-ignore - Supabase update type inference issue
      .update({
        status: 'published',
        published_at: publishedAt,
        updated_at: publishedAt,
      })
      .eq('id', input.eventId)
      .select(`
        id,
        slug,
        title,
        description,
        start_date,
        end_date,
        location,
        capacity,
        status,
        published_at,
        ticket_types(
          id,
          name,
          description,
          price,
          quantity,
          available
        )
      `)
      .single();
    
    const publishedEvent = pubEvent as unknown as (Pick<Event, 'id' | 'slug' | 'title' | 'description' | 'start_date' | 'end_date' | 'location' | 'capacity' | 'status' | 'published_at'> & {
      ticket_types: any[];
    }) | null;
    
    if (publishError || !publishedEvent) {
      throw new DatabaseError('Failed to publish event', publishError);
    }
    
    // ----------------------------------------------------------------
    // 6. EMIT DOMAIN EVENT
    // ----------------------------------------------------------------
    // TODO: Implement domain event emission
    // await emitDomainEvent({
    //   type: 'EventPublished',
    //   timestamp: publishedAt,
    //   aggregateId: input.eventId,
    //   payload: {
    //     eventId: input.eventId,
    //     title: publishedEvent.title,
    //     slug: publishedEvent.slug,
    //     startDate: publishedEvent.start_date,
    //     ticketTypeCount: publishedEvent.ticket_types?.length || 0,
    //   },
    // });
    
    // ----------------------------------------------------------------
    // 7. RETURN SUCCESS
    // ----------------------------------------------------------------
    return successResult<PublishEventOutput>({
      eventId: publishedEvent.id,
      slug: publishedEvent.slug,
      status: publishedEvent.status as any,
      publishedAt: publishedEvent.published_at!,
    });
    
  } catch (error) {
    if (error instanceof CommandExecutionError) {
      return errorResult(error);
    }
    
    console.error('[PublishEvent] Unexpected error:', error);
    return errorResult(
      new DatabaseError('An unexpected error occurred while publishing event')
    );
  }
}
