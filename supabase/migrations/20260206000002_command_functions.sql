-- =====================================================================
-- Transaction Functions for Commands
-- =====================================================================
-- Purpose: PostgreSQL functions for atomic command execution
-- Security: SECURITY DEFINER to bypass RLS (service role equivalent)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Function: register_for_event_transaction
-- Purpose: Atomically register user, generate QR, decrement tickets
-- Used by: CMD-004 RegisterForEvent
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION register_for_event_transaction(
    p_event_id UUID,
    p_user_id UUID,
    p_ticket_type_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with function owner's privileges (bypasses RLS)
AS $$
DECLARE
    v_registration_id UUID;
    v_ticket_code UUID;
    v_qr_data TEXT;
    v_timestamp TIMESTAMPTZ;
    v_available INTEGER;
    v_event_title TEXT;
    v_event_start_date TIMESTAMPTZ;
    v_event_end_date TIMESTAMPTZ;
    v_event_location TEXT;
    v_ticket_name TEXT;
    v_ticket_price DECIMAL(10,2);
BEGIN
    -- Set timestamp for QR code generation
    v_timestamp := NOW();
    
    -- Lock ticket type row for update (prevents race conditions)
    SELECT available, name, price
    INTO v_available, v_ticket_name, v_ticket_price
    FROM ticket_types
    WHERE id = p_ticket_type_id AND event_id = p_event_id
    FOR UPDATE;
    
    -- Check if ticket type found
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ticket type not found'
            USING ERRCODE = '23503'; -- foreign_key_violation
    END IF;
    
    -- Check availability
    IF v_available <= 0 THEN
        RAISE EXCEPTION 'Tickets sold out'
            USING ERRCODE = '23P01'; -- exclusion_violation (closest to capacity error)
    END IF;
    
    -- Get event details
    SELECT title, start_date, end_date, location
    INTO v_event_title, v_event_start_date, v_event_end_date, v_event_location
    FROM events
    WHERE id = p_event_id;
    
    -- Create registration
    INSERT INTO registrations (
        event_id,
        user_id,
        ticket_type_id,
        qr_data, -- Will be updated with proper QR data
        status,
        created_at
    )
    VALUES (
        p_event_id,
        p_user_id,
        p_ticket_type_id,
        'temp', -- Placeholder, will be updated
        'confirmed',
        v_timestamp
    )
    RETURNING id, ticket_code INTO v_registration_id, v_ticket_code;
    
    -- Generate QR data: eventId:registrationId:timestamp:signature
    -- Note: Signature generation happens in application layer (requires secret key)
    -- For now, we just format the data payload
    v_qr_data := p_event_id::TEXT || ':' || v_registration_id::TEXT || ':' || v_timestamp::TEXT;
    
    -- Update registration with QR data placeholder
    -- The application will add the signature
    UPDATE registrations
    SET qr_data = v_qr_data
    WHERE id = v_registration_id;
    
    -- Decrement available tickets
    UPDATE ticket_types
    SET available = available - 1
    WHERE id = p_ticket_type_id;
    
    -- Return result as JSON
    RETURN json_build_object(
        'registration_id', v_registration_id,
        'ticket_code', v_ticket_code,
        'qr_data', v_qr_data,
        'event_title', v_event_title,
        'event_start_date', v_event_start_date,
        'event_end_date', v_event_end_date,
        'event_location', v_event_location,
        'ticket_name', v_ticket_name,
        'ticket_price', v_ticket_price
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Re-raise exception to trigger rollback
        RAISE;
END;
$$;

-- Comment
COMMENT ON FUNCTION register_for_event_transaction IS 
'Atomically registers user for event, generates QR code, and decrements ticket availability. Used by CMD-004.';

-- ---------------------------------------------------------------------
-- Function: check_in_ticket_transaction
-- Purpose: Atomically validate QR and update check-in status
-- Used by: CMD-006 CheckInTicket
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_in_ticket_transaction(
    p_registration_id UUID,
    p_staff_id UUID,
    p_method checkin_method,
    p_location TEXT DEFAULT NULL,
    p_device_info JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_check_in_id UUID;
    v_registration_status registration_status;
    v_checked_in_at TIMESTAMPTZ;
    v_attendee_name TEXT;
    v_ticket_type_name TEXT;
    v_timestamp TIMESTAMPTZ;
BEGIN
    v_timestamp := NOW();
    
    -- Lock registration row
    SELECT status, checked_in_at
    INTO v_registration_status, v_checked_in_at
    FROM registrations
    WHERE id = p_registration_id
    FOR UPDATE;
    
    -- Check if registration found
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registration not found'
            USING ERRCODE = '23503';
    END IF;
    
    -- Check if already checked in
    IF v_registration_status = 'checked_in' THEN
        -- Return existing check-in info (idempotent)
        SELECT u.full_name, tt.name
        INTO v_attendee_name, v_ticket_type_name
        FROM registrations r
        INNER JOIN profiles u ON u.id = r.user_id
        INNER JOIN ticket_types tt ON tt.id = r.ticket_type_id
        WHERE r.id = p_registration_id;
        
        RETURN json_build_object(
            'already_checked_in', true,
            'checked_in_at', v_checked_in_at,
            'attendee_name', v_attendee_name,
            'ticket_type', v_ticket_type_name
        );
    END IF;
    
    -- Check if cancelled
    IF v_registration_status = 'cancelled' THEN
        RAISE EXCEPTION 'Registration has been cancelled'
            USING ERRCODE = '23P01';
    END IF;
    
    -- Get attendee details
    SELECT u.full_name, tt.name
    INTO v_attendee_name, v_ticket_type_name
    FROM registrations r
    INNER JOIN profiles u ON u.id = r.user_id
    INNER JOIN ticket_types tt ON tt.id = r.ticket_type_id
    WHERE r.id = p_registration_id;
    
    -- Update registration status
    UPDATE registrations
    SET 
        status = 'checked_in',
        checked_in_at = v_timestamp,
        checked_in_by = p_staff_id
    WHERE id = p_registration_id;
    
    -- Create check-in record
    INSERT INTO check_ins (
        registration_id,
        staff_id,
        method,
        location,
        device_info,
        timestamp
    )
    VALUES (
        p_registration_id,
        p_staff_id,
        p_method,
        p_location,
        p_device_info,
        v_timestamp
    )
    RETURNING id INTO v_check_in_id;
    
    -- Return result
    RETURN json_build_object(
        'check_in_id', v_check_in_id,
        'registration_id', p_registration_id,
        'attendee_name', v_attendee_name,
        'ticket_type', v_ticket_type_name,
        'checked_in_at', v_timestamp,
        'already_checked_in', false
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

COMMENT ON FUNCTION check_in_ticket_transaction IS 
'Atomically validates ticket and updates check-in status. Used by CMD-006.';

-- ---------------------------------------------------------------------
-- Function: cancel_registration_transaction
-- Purpose: Atomically cancel registration and increment tickets
-- Used by: CMD-010 CancelRegistration
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cancel_registration_transaction(
    p_registration_id UUID,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_registration_status registration_status;
    v_ticket_type_id UUID;
    v_checked_in_at TIMESTAMPTZ;
    v_event_start_date TIMESTAMPTZ;
    v_timestamp TIMESTAMPTZ;
BEGIN
    v_timestamp := NOW();
    
    -- Lock registration row
    SELECT r.status, r.ticket_type_id, r.checked_in_at, e.start_date
    INTO v_registration_status, v_ticket_type_id, v_checked_in_at, v_event_start_date
    FROM registrations r
    INNER JOIN events e ON e.id = r.event_id
    WHERE r.id = p_registration_id AND r.user_id = p_user_id
    FOR UPDATE;
    
    -- Check if registration found
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registration not found or unauthorized'
            USING ERRCODE = '23503';
    END IF;
    
    -- Check if already cancelled
    IF v_registration_status = 'cancelled' THEN
        RAISE EXCEPTION 'Registration already cancelled'
            USING ERRCODE = '23P01';
    END IF;
    
    -- Check if already checked in
    IF v_registration_status = 'checked_in' THEN
        RAISE EXCEPTION 'Cannot cancel after check-in'
            USING ERRCODE = '23P01';
    END IF;
    
    -- Check cancellation deadline (1 hour before event start)
    IF v_timestamp >= (v_event_start_date - INTERVAL '1 hour') THEN
        RAISE EXCEPTION 'Cancellation deadline has passed (must cancel at least 1 hour before event)'
            USING ERRCODE = '23P01';
    END IF;
    
    -- Update registration status
    UPDATE registrations
    SET 
        status = 'cancelled',
        cancelled_at = v_timestamp
    WHERE id = p_registration_id;
    
    -- Increment available tickets
    UPDATE ticket_types
    SET available = available + 1
    WHERE id = v_ticket_type_id;
    
    -- Return result
    RETURN json_build_object(
        'registration_id', p_registration_id,
        'status', 'cancelled',
        'cancelled_at', v_timestamp,
        'refund_eligible', true
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

COMMENT ON FUNCTION cancel_registration_transaction IS 
'Atomically cancels registration and increments ticket availability. Used by CMD-010.';
