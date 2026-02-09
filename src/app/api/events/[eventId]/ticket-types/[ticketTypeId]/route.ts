// =====================================================================
// API Route: Update/Delete Ticket Type
// =====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: {
    eventId: string;
    ticketTypeId: string;
  };
}

// PATCH: Update ticket type
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify event ownership
    const { data: event } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', params.eventId)
      .single();

    if (!event || event.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get current ticket type to check sold tickets
    const { data: currentTicketType } = await supabase
      .from('ticket_types')
      .select('quantity, available')
      .eq('id', params.ticketTypeId)
      .eq('event_id', params.eventId)
      .single();

    if (!currentTicketType) {
      return NextResponse.json(
        { error: 'Ticket type not found' },
        { status: 404 }
      );
    }

    const soldTickets = currentTicketType.quantity - currentTicketType.available;

    // Parse request body
    const body = await request.json();
    const { name, description, price, quantity } = body;

    // Validate quantity (cannot be less than sold tickets)
    if (quantity < soldTickets) {
      return NextResponse.json(
        {
          error: `Cannot reduce quantity below ${soldTickets} (already sold)`,
        },
        { status: 400 }
      );
    }

    // Calculate new available quantity
    const newAvailable = quantity - soldTickets;

    // Update ticket type
    const { data: updatedTicketType, error: updateError } = await supabase
      .from('ticket_types')
      .update({
        name,
        description,
        price,
        quantity,
        available: newAvailable,
      })
      .eq('id', params.ticketTypeId)
      .eq('event_id', params.eventId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating ticket type:', updateError);
      return NextResponse.json(
        { error: 'Failed to update ticket type' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ticketType: updatedTicketType,
    });
  } catch (error) {
    console.error('Error in PATCH /api/events/[eventId]/ticket-types/[ticketTypeId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete ticket type
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify event ownership
    const { data: event } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', params.eventId)
      .single();

    if (!event || event.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if ticket type has any registrations
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('id')
      .eq('ticket_type_id', params.ticketTypeId)
      .limit(1);

    if (regError) {
      console.error('Error checking registrations:', regError);
      return NextResponse.json(
        { error: 'Failed to check registrations' },
        { status: 500 }
      );
    }

    if (registrations && registrations.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete ticket type with existing registrations',
        },
        { status: 400 }
      );
    }

    // Delete ticket type
    const { error: deleteError } = await supabase
      .from('ticket_types')
      .delete()
      .eq('id', params.ticketTypeId)
      .eq('event_id', params.eventId);

    if (deleteError) {
      console.error('Error deleting ticket type:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete ticket type' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket type deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/events/[eventId]/ticket-types/[ticketTypeId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
