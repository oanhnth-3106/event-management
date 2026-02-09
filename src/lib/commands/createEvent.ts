// =====================================================================
// CMD-001: CreateEvent
// =====================================================================
// Purpose: Create a new event in draft status
// Authorization: User must have organizer or admin role
// Transaction: Single insert (no transaction needed)
// =====================================================================

import { createServiceClient } from '@/lib/supabase/service';
import { slugify } from '@/lib/utils';
import type {
  CreateEventInput,
  CreateEventOutput,
  CommandResult,
} from '@/types/command.types';
import type { Event, Profile } from '@/types/database.types';
import {
  CommandExecutionError,
  ValidationError,
  AuthorizationError,
  DatabaseError,
  successResult,
  errorResult,
} from './errors';
import { CreateEventErrors } from '@/types/command.types';

/**
 * CMD-001: CreateEvent
 * 
 * Creates a new event in draft status
 * 
 * Preconditions:
 * - User must have organizer or admin role
 * - Title must be 5-200 characters
 * - Start date must be in the future
 * - End date must be after start date
 * - Capacity must be > 0
 * 
 * Postconditions:
 * - Event created with status = 'draft'
 * - Unique slug generated from title
 * - EventCreated domain event emitted
 * 
 * @param input - Event creation data
 * @returns Created event details
 */
export async function createEvent(
  input: CreateEventInput
): Promise<CommandResult<CreateEventOutput>> {
  try {
    const supabase = createServiceClient();
    
    // ----------------------------------------------------------------
    // 1. AUTHORIZATION CHECK
    // ----------------------------------------------------------------
    // Verify user has organizer or admin role
    const { data: prof, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', input.organizerId)
      .single();
    
    console.log('[createEvent] Profile check:', { 
      organizerId: input.organizerId,
      prof, 
      profileError,
      hasProfile: !!prof 
    });
    
    const profile = prof as unknown as Pick<Profile, 'role'> | null;
    
    if (profileError || !profile) {
      console.error('[createEvent] Profile error:', profileError);
      throw new AuthorizationError('User not found');
    }
    
    if (profile.role !== 'organizer' && profile.role !== 'admin') {
      throw new AuthorizationError(CreateEventErrors.UNAUTHORIZED);
    }
    
    // ----------------------------------------------------------------
    // 2. INPUT VALIDATION
    // ----------------------------------------------------------------
    // Validate title length
    if (input.title.length < 5 || input.title.length > 200) {
      throw new ValidationError(CreateEventErrors.INVALID_TITLE_LENGTH, {
        title: input.title,
        length: input.title.length,
      });
    }
    
    // Validate capacity
    if (input.capacity <= 0) {
      throw new ValidationError('Capacity must be greater than 0', {
        capacity: input.capacity,
      });
    }
    
    // Validate date range
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    const now = new Date();
    
    if (startDate <= now) {
      throw new ValidationError(CreateEventErrors.START_DATE_IN_PAST, {
        startDate: input.startDate,
        now: now.toISOString(),
      });
    }
    
    if (endDate <= startDate) {
      throw new ValidationError(CreateEventErrors.INVALID_DATE_RANGE, {
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }
    
    // Validate location
    if (!input.location || input.location.length === 0) {
      throw new ValidationError('Location is required');
    }
    
    if (input.location.length > 500) {
      throw new ValidationError('Location must be 500 characters or less', {
        length: input.location.length,
      });
    }
    
    // Validate description length if provided
    if (input.description && input.description.length > 5000) {
      throw new ValidationError('Description must be 5000 characters or less', {
        length: input.description.length,
      });
    }
    
    // ----------------------------------------------------------------
    // 3. GENERATE SLUG
    // ----------------------------------------------------------------
    // Generate base slug from title
    let slug = slugify(input.title);
    let slugSuffix = 0;
    let finalSlug = slug;
    
    // Ensure slug is unique (append number if needed)
    while (true) {
      const { data: existingEvent } = await supabase
        .from('events')
        .select('id')
        .eq('slug', finalSlug)
        .single();
      
      if (!existingEvent) {
        // Slug is unique
        break;
      }
      
      // Slug exists, try with suffix
      slugSuffix++;
      finalSlug = `${slug}-${slugSuffix}`;
    }
    
    // ----------------------------------------------------------------
    // 4. HANDLE IMAGE UPLOAD (if provided)
    // ----------------------------------------------------------------
    let imageUrl: string | undefined;
    
    // Use provided imageUrl if available
    if (input.imageUrl) {
      imageUrl = input.imageUrl;
    } else if (input.imageFile) {
      // TODO: Implement image upload to Supabase Storage
      // For now, skip image upload (will be implemented in separate unit)
      // const uploadResult = await uploadEventImage(input.imageFile, eventId);
      // imageUrl = uploadResult.publicUrl;
      imageUrl = undefined; // Placeholder
    }
    
    // ----------------------------------------------------------------
    // 5. CREATE EVENT
    // ----------------------------------------------------------------
    const { data: evt, error: insertError } = await supabase
      .from('events')
      // @ts-ignore - Supabase insert type inference issue
      .insert({
        organizer_id: input.organizerId,
        title: input.title,
        slug: finalSlug,
        description: input.description || null,
        start_date: input.startDate,
        end_date: input.endDate,
        location: input.location,
        capacity: input.capacity,
        image_url: imageUrl || null,
        status: 'draft',
      })
      .select('id, slug, status, image_url, created_at')
      .single();
    
    const event = evt as unknown as Pick<Event, 'id' | 'slug' | 'status' | 'image_url' | 'created_at'> | null;
    
    if (insertError || !event) {
      throw new DatabaseError('Failed to create event', insertError);
    }
    
    // ----------------------------------------------------------------
    // 6. EMIT DOMAIN EVENT
    // ----------------------------------------------------------------
    // TODO: Implement domain event emission
    // await emitDomainEvent({
    //   type: 'EventCreated',
    //   timestamp: new Date().toISOString(),
    //   aggregateId: event.id,
    //   payload: {
    //     organizerId: input.organizerId,
    //     title: input.title,
    //     slug: finalSlug,
    //     startDate: input.startDate,
    //     endDate: input.endDate,
    //   },
    // });
    
    // ----------------------------------------------------------------
    // 7. RETURN RESULT
    // ----------------------------------------------------------------
    return successResult<CreateEventOutput>({
      eventId: event.id,
      slug: event.slug,
      status: event.status,
      imageUrl: event.image_url || undefined,
      createdAt: event.created_at,
    });
    
  } catch (error) {
    // Handle known command errors
    if (error instanceof CommandExecutionError) {
      return errorResult(error);
    }
    
    // Handle unexpected errors
    console.error('[CreateEvent] Unexpected error:', error);
    return errorResult(
      new DatabaseError('An unexpected error occurred while creating event')
    );
  }
}
