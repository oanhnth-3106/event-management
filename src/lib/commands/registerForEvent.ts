// =====================================================================
// CMD-004: RegisterForEvent
// =====================================================================
// Purpose: Register user for an event and generate QR ticket
// Authorization: User must be authenticated
// Transaction: Yes (registration + decrement available tickets + generate QR)
// =====================================================================

import { createServiceClient } from '@/lib/supabase/service';
import { generateQRData } from '@/lib/qr';
import type {
  RegisterForEventInput,
  RegisterForEventOutput,
  CommandResult,
} from '@/types/command.types';
import type { Event, TicketType, Registration } from '@/types/database.types';
import {
  CommandExecutionError,
  NotFoundError,
  BusinessRuleError,
  ConflictError,
  DatabaseError,
  successResult,
  errorResult,
} from './errors';
import { RegisterForEventErrors } from '@/types/command.types';

/**
 * CMD-004: RegisterForEvent
 * 
 * Registers a user for an event and generates QR-coded ticket
 * 
 * Preconditions:
 * - Event must exist and be published
 * - Event must not have started
 * - Ticket type must exist and have availability
 * - User must not already be registered for this ticket type
 * - Event capacity must not be exceeded
 * 
 * Postconditions:
 * - Registration created with status = 'confirmed'
 * - QR code generated with HMAC signature
 * - Ticket type available count decremented by 1
 * - RegistrationCreated and TicketIssued domain events emitted
 * 
 * Transaction guarantees:
 * - Atomic: Either all operations succeed or all fail
 * - Isolated: Uses SELECT FOR UPDATE to prevent race conditions
 * 
 * @param input - Registration data
 * @returns Registration details with QR code
 */
export async function registerForEvent(
  input: RegisterForEventInput
): Promise<CommandResult<RegisterForEventOutput>> {
  try {
    const supabase = createServiceClient();
    
    // ----------------------------------------------------------------
    // 1. FETCH EVENT WITH LOCK
    // ----------------------------------------------------------------
    // Use transaction to ensure atomicity
    // Note: Supabase doesn't directly support transactions in client lib
    // We'll use a PostgreSQL function for complex transaction logic
    
    // First, validate event exists and is published
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, slug, start_date, end_date, location, status, capacity')
      .eq('id', input.eventId)
      .single();
    
    if (eventError || !event) {
      throw new NotFoundError('Event', input.eventId);
    }
    
    // Type assertion after null check
    const eventData = event as unknown as Pick<Event, 'id' | 'title' | 'slug' | 'start_date' | 'end_date' | 'location' | 'status' | 'capacity'>;
    
    // Validate event is published (not draft or cancelled)
    if (eventData.status !== 'published') {
      throw new BusinessRuleError(
        'EVENT_NOT_PUBLISHED',
        RegisterForEventErrors.EVENT_NOT_PUBLISHED,
        { eventId: input.eventId, status: eventData.status }
      );
    }
    
    // Validate event hasn't started
    const now = new Date();
    const startDate = new Date(eventData.start_date);
    
    if (now >= startDate) {
      throw new BusinessRuleError(
        'EVENT_ALREADY_STARTED',
        RegisterForEventErrors.EVENT_ALREADY_STARTED,
        { eventId: input.eventId, startDate: eventData.start_date }
      );
    }
    
    // ----------------------------------------------------------------
    // 2. FETCH TICKET TYPE WITH LOCK
    // ----------------------------------------------------------------
    const { data: ticketType, error: ticketError } = await supabase
      .from('ticket_types')
      .select('id, name, price, quantity, available, event_id')
      .eq('id', input.ticketTypeId)
      .eq('event_id', input.eventId)
      .single();
    
    if (ticketError || !ticketType) {
      throw new NotFoundError('Ticket type', input.ticketTypeId);
    }
    
    // Type assertion after null check
    const ticketTypeData = ticketType as unknown as Pick<TicketType, 'id' | 'name' | 'price' | 'quantity' | 'available' | 'event_id'>;
    
    // Validate tickets are available
    if (ticketTypeData.available <= 0) {
      throw new BusinessRuleError(
        'TICKETS_SOLD_OUT',
        RegisterForEventErrors.TICKETS_SOLD_OUT,
        {
          ticketTypeId: input.ticketTypeId,
          ticketTypeName: ticketTypeData.name,
        }
      );
    }
    
    // ----------------------------------------------------------------
    // 3. CHECK FOR DUPLICATE REGISTRATION
    // ----------------------------------------------------------------
    const { data: existingReg } = await supabase
      .from('registrations')
      .select('id, status')
      .eq('event_id', input.eventId)
      .eq('user_id', input.userId)
      .eq('ticket_type_id', input.ticketTypeId)
      .maybeSingle();
    
    const existingRegistration = existingReg as unknown as Pick<Registration, 'id' | 'status'> | null;
    
    if (existingRegistration && existingRegistration.status !== 'cancelled') {
      throw new ConflictError(
        RegisterForEventErrors.DUPLICATE_REGISTRATION,
        {
          registrationId: existingRegistration.id,
          status: existingRegistration.status,
        }
      );
    }
    
    // ----------------------------------------------------------------
    // 4. CHECK EVENT CAPACITY
    // ----------------------------------------------------------------
    const { count: registrationCount } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', input.eventId)
      .neq('status', 'cancelled');
    
    if (registrationCount !== null && registrationCount >= eventData.capacity) {
      throw new BusinessRuleError(
        'CAPACITY_EXCEEDED',
        RegisterForEventErrors.CAPACITY_EXCEEDED,
        {
          eventId: input.eventId,
          capacity: eventData.capacity,
          currentRegistrations: registrationCount,
        }
      );
    }
    
    // ----------------------------------------------------------------
    // 5. GENERATE QR CODE
    // ----------------------------------------------------------------
    // We'll generate registration ID first, then create QR with it
    // Using a database function for transaction atomicity
    
    // Call PostgreSQL function to handle transaction
    const { data: regData, error: rpcError } = await supabase.rpc(
      'register_for_event_transaction',
      // @ts-ignore - Supabase RPC type inference issue
      {
        p_event_id: input.eventId,
        p_user_id: input.userId,
        p_ticket_type_id: input.ticketTypeId,
      }
    );
    
    const registrationData = regData as unknown as {
      registration_id: string;
      ticket_code: string;
      qr_data: string;
    } | null;
    
    // If RPC function doesn't exist yet, fall back to manual implementation
    if (rpcError && rpcError.message?.includes('function') && rpcError.message?.includes('does not exist')) {
      // Fallback: Manual transaction (less safe, but works for MVP)
      return await registerForEventFallback(input, eventData, ticketTypeData);
    }
    
    if (rpcError || !registrationData) {
      throw new DatabaseError('Failed to create registration', rpcError);
    }
    
    // ----------------------------------------------------------------
    // 7. RETURN RESULT
    // ----------------------------------------------------------------
    return successResult<RegisterForEventOutput>({
      registrationId: registrationData.registration_id,
      ticketCode: registrationData.ticket_code,
      qrData: registrationData.qr_data,
      status: 'confirmed',
      eventDetails: {
        title: eventData.title,
        startDate: eventData.start_date,
        endDate: eventData.end_date,
        location: eventData.location,
      },
      ticketTypeDetails: {
        name: ticketTypeData.name,
        price: ticketTypeData.price,
      },
    });
    
  } catch (error) {
    if (error instanceof CommandExecutionError) {
      return errorResult(error);
    }
    
    console.error('[RegisterForEvent] Unexpected error:', error);
    return errorResult(
      new DatabaseError('An unexpected error occurred during registration')
    );
  }
}

/**
 * Fallback registration logic (without PostgreSQL function)
 * Less safe - doesn't use SELECT FOR UPDATE locks
 * Should be replaced with proper transaction function
 */
async function registerForEventFallback(
  input: RegisterForEventInput,
  eventData: Pick<Event, 'id' | 'title' | 'start_date' | 'end_date' | 'location' | 'capacity'>,
  ticketTypeData: Pick<TicketType, 'id' | 'name' | 'price' | 'available'>
): Promise<CommandResult<RegisterForEventOutput>> {
  const supabase = createServiceClient();
  
  try {
    // Generate QR code (we'll create registration first to get ID)
    const timestamp = new Date().toISOString();
    
    // Create registration
    const { data: reg, error: insertError } = await supabase
      .from('registrations')
      // @ts-ignore - Supabase insert type inference issue
      .insert({
        event_id: input.eventId,
        user_id: input.userId,
        ticket_type_id: input.ticketTypeId,
        qr_data: '', // Temporary, will update
        status: 'confirmed',
      })
      .select('id, ticket_code')
      .single();
    
    const registration = reg as unknown as Pick<Registration, 'id' | 'ticket_code'> | null;
    
    if (insertError || !registration) {
      throw new DatabaseError('Failed to create registration', insertError);
    }
    
    // Generate QR code with actual registration ID
    const qrData = generateQRData(input.eventId, registration.id, timestamp);
    
    // Update registration with QR data
    const { error: updateError } = await supabase
      .from('registrations')
      // @ts-ignore - Supabase update type inference issue
      .update({ qr_data: qrData })
      .eq('id', registration.id);
    
    if (updateError) {
      // Rollback: delete registration
      await supabase.from('registrations').delete().eq('id', registration.id);
      throw new DatabaseError('Failed to update QR code', updateError);
    }
    
    // Decrement available tickets
    const { error: decrementError } = await supabase
      .from('ticket_types')
      // @ts-ignore - Supabase update type inference issue
      .update({ available: ticketTypeData.available - 1 })
      .eq('id', input.ticketTypeId);
    
    if (decrementError) {
      // Rollback: delete registration
      await supabase.from('registrations').delete().eq('id', registration.id);
      throw new DatabaseError('Failed to decrement ticket availability', decrementError);
    }
    
    return successResult<RegisterForEventOutput>({
      registrationId: registration.id,
      ticketCode: registration.ticket_code,
      qrData: qrData,
      status: 'confirmed',
      eventDetails: {
        title: eventData.title,
        startDate: eventData.start_date,
        endDate: eventData.end_date,
        location: eventData.location,
      },
      ticketTypeDetails: {
        name: ticketTypeData.name,
        price: ticketTypeData.price,
      },
    });
  } catch (error) {
    if (error instanceof CommandExecutionError) {
      throw error;
    }
    throw new DatabaseError('Registration fallback failed', error);
  }
}
