// =====================================================================
// CMD-002: ConfigureTicketType
// =====================================================================
// Purpose: Create or update a ticket type for an event
// Authorization: Must be event organizer or admin
// Transaction: No (single insert/update)
// =====================================================================

import { createServiceClient } from '@/lib/supabase/service';
import type {
  ConfigureTicketTypeInput,
  ConfigureTicketTypeOutput,
  CommandResult,
} from '@/types/command.types';
import type { Event, Profile, TicketType } from '@/types/database.types';
import {
  CommandExecutionError,
  NotFoundError,
  ValidationError,
  AuthorizationError,
  BusinessRuleError,
  DatabaseError,
  successResult,
  errorResult,
} from './errors';
import { ConfigureTicketTypeErrors } from '@/types/command.types';

/**
 * CMD-002: ConfigureTicketType
 * 
 * Creates or updates a ticket type for an event
 * 
 * Preconditions:
 * - Event must exist
 * - User must be organizer of the event or admin
 * - Event must be in draft status (cannot modify published event ticket types)
 * - Name must be unique within the event
 * - Price must be >= 0
 * - Quantity must be > 0
 * - If updating, ticket type must exist
 * 
 * Postconditions:
 * - Ticket type created or updated
 * - TicketTypeConfigured domain event emitted
 * 
 * @param input - Ticket type configuration
 * @returns Created or updated ticket type
 */
export async function configureTicketType(
  input: ConfigureTicketTypeInput
): Promise<CommandResult<ConfigureTicketTypeOutput>> {
  try {
    const supabase = createServiceClient();
    
    // ----------------------------------------------------------------
    // 1. FETCH EVENT AND VERIFY AUTHORIZATION
    // ----------------------------------------------------------------
    const { data: evt, error: eventError } = await supabase
      .from('events')
      .select('id, organizer_id, status')
      .eq('id', input.eventId)
      .single();
    
    const event = evt as unknown as Pick<Event, 'id' | 'organizer_id' | 'status'> | null;
    
    if (eventError || !event) {
      throw new NotFoundError('Event', input.eventId);
    }
    
    // Verify authorization
    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', input.organizerId)
      .single();
    
    const profile = prof as unknown as Pick<Profile, 'role'> | null;
    
    const isOrganizer = event.organizer_id === input.organizerId;
    const isAdmin = profile?.role === 'admin';
    
    if (!isOrganizer && !isAdmin) {
      throw new AuthorizationError(ConfigureTicketTypeErrors.UNAUTHORIZED);
    }
    
    // ----------------------------------------------------------------
    // 2. VALIDATE EVENT STATUS
    // ----------------------------------------------------------------
    // Can only configure ticket types for draft events
    if (event.status !== 'draft') {
      throw new BusinessRuleError(
        'EVENT_ALREADY_PUBLISHED',
        'Cannot modify ticket types after event is published',
        { eventId: input.eventId, status: event.status }
      );
    }
    
    // ----------------------------------------------------------------
    // 3. VALIDATE INPUT
    // ----------------------------------------------------------------
    const validationErrors: string[] = [];
    
    // Name validation
    if (!input.name || input.name.trim().length < 3) {
      validationErrors.push('Name must be at least 3 characters');
    }
    if (input.name && input.name.length > 100) {
      validationErrors.push('Name must not exceed 100 characters');
    }
    
    // Price validation
    if (input.price < 0) {
      validationErrors.push('Price must be >= 0');
    }
    
    // Quantity validation
    if (input.quantity <= 0) {
      validationErrors.push('Quantity must be > 0');
    }
    if (input.quantity > 100000) {
      validationErrors.push('Quantity must not exceed 100,000');
    }
    
    // Description validation (optional)
    if (input.description && input.description.length > 500) {
      validationErrors.push('Description must not exceed 500 characters');
    }
    
    if (validationErrors.length > 0) {
      throw new ValidationError(validationErrors.join('; '));
    }
    
    // ----------------------------------------------------------------
    // 4. CHECK FOR DUPLICATE NAME (within same event)
    // ----------------------------------------------------------------
    const { data: existingTTs } = await supabase
      .from('ticket_types')
      .select('id, name')
      .eq('event_id', input.eventId)
      .ilike('name', input.name.trim());
    
    const existingTicketTypes = existingTTs as unknown as Pick<TicketType, 'id' | 'name'>[] | null;
    
    if (existingTicketTypes && existingTicketTypes.length > 0) {
      // If updating, allow same name for the same ticket type
      const isDuplicate = existingTicketTypes.some(
        (tt) => tt.id !== input.ticketTypeId && tt.name.toLowerCase() === input.name.trim().toLowerCase()
      );
      
      if (isDuplicate) {
        throw new BusinessRuleError(
          'DUPLICATE_TICKET_TYPE',
          'Ticket type with this name already exists',
          { name: input.name }
        );
      }
    }
    
    // ----------------------------------------------------------------
    // 5. CREATE OR UPDATE TICKET TYPE
    // ----------------------------------------------------------------
    let ticketType: TicketType;
    
    if (input.ticketTypeId) {
      // UPDATE existing ticket type
      const { data, error } = await supabase
        .from('ticket_types')
        // @ts-ignore - Supabase update type inference issue
        .update({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          price: input.price,
          quantity: input.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.ticketTypeId)
        .eq('event_id', input.eventId) // Ensure ticket type belongs to event
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('TicketType', input.ticketTypeId);
        }
        throw new DatabaseError('Failed to update ticket type', error);
      }
      
      ticketType = data as TicketType;
    } else {
      // CREATE new ticket type
      const { data, error } = await supabase
        .from('ticket_types')
        // @ts-ignore - Supabase insert type inference issue
        .insert({
          event_id: input.eventId,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          price: input.price,
          quantity: input.quantity,
          available: input.quantity, // Initially same as quantity
        })
        .select()
        .single();
      
      if (error) {
        throw new DatabaseError('Failed to create ticket type', error);
      }
      
      ticketType = data as TicketType;
    }
    
    // ----------------------------------------------------------------
    // 6. EMIT DOMAIN EVENT
    // ----------------------------------------------------------------
    // TODO: Implement domain event emission
    // await emitDomainEvent({
    //   type: 'TicketTypeConfigured',
    //   timestamp: new Date().toISOString(),
    //   aggregateId: ticketType.id,
    //   payload: {
    //     eventId: input.eventId,
    //     ticketTypeId: ticketType.id,
    //     name: ticketType.name,
    //     price: ticketType.price,
    //     quantity: ticketType.quantity,
    //     isUpdate: !!input.ticketTypeId,
    //   },
    // });
    
    // ----------------------------------------------------------------
    // 7. RETURN SUCCESS
    // ----------------------------------------------------------------
    return successResult<ConfigureTicketTypeOutput>({
      ticketTypeId: ticketType.id,
      name: ticketType.name,
      price: ticketType.price,
      quantity: ticketType.quantity,
      available: ticketType.available,
    });
    
  } catch (error) {
    if (error instanceof CommandExecutionError) {
      return errorResult(error);
    }
    
    console.error('[ConfigureTicketType] Unexpected error:', error);
    return errorResult(
      new DatabaseError('An unexpected error occurred while configuring ticket type')
    );
  }
}
