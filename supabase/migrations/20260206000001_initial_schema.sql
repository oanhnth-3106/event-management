-- =====================================================================
-- Event Management System - Initial Database Schema
-- =====================================================================
-- Version: 1.0
-- Date: February 6, 2026
-- Description: Core schema for event management, ticketing, and check-in
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- CUSTOM TYPES (Enums)
-- =====================================================================

-- User role enumeration
CREATE TYPE user_role AS ENUM ('attendee', 'organizer', 'staff', 'admin');

-- Event status enumeration
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- Registration status enumeration
CREATE TYPE registration_status AS ENUM ('confirmed', 'checked_in', 'cancelled');

-- Check-in method enumeration
CREATE TYPE checkin_method AS ENUM ('qr', 'manual');

-- Reminder type enumeration
CREATE TYPE reminder_type AS ENUM ('24h', '2h');

-- =====================================================================
-- TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table: profiles
-- Purpose: Extended user profile information (linked to auth.users)
-- Note: Supabase Auth manages authentication, this table stores profile data
-- ---------------------------------------------------------------------
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
    phone TEXT CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{1,14}$'), -- E.164 format
    role user_role NOT NULL DEFAULT 'attendee',
    avatar_url TEXT,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    reminder_opt_out BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Comments for profiles
COMMENT ON TABLE profiles IS 'Extended user profile information linked to Supabase Auth';
COMMENT ON COLUMN profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN profiles.phone IS 'E.164 format phone number (e.g., +12125551234)';
COMMENT ON COLUMN profiles.role IS 'Primary role: attendee, organizer, staff, admin';
COMMENT ON COLUMN profiles.reminder_opt_out IS 'If true, user will not receive event reminder emails';

-- ---------------------------------------------------------------------
-- Table: events
-- Purpose: Core event information
-- Constraints: INV-E-001 to INV-E-006
-- ---------------------------------------------------------------------
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
    slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
    description TEXT CHECK (description IS NULL OR char_length(description) <= 5000),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL CHECK (char_length(location) <= 500),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    image_url TEXT,
    status event_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT end_after_start CHECK (end_date > start_date),
    CONSTRAINT future_start_on_create CHECK (start_date > created_at),
    CONSTRAINT published_at_set_when_published CHECK (
        (status = 'published' AND published_at IS NOT NULL) OR
        (status != 'published' AND published_at IS NULL)
    ),
    CONSTRAINT cancelled_at_set_when_cancelled CHECK (
        (status = 'cancelled' AND cancelled_at IS NOT NULL) OR
        (status != 'cancelled' AND cancelled_at IS NULL)
    ),
    CONSTRAINT completed_at_set_when_completed CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed' AND completed_at IS NULL)
    )
);

-- Indexes for events
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_published_upcoming ON events(start_date, status) 
    WHERE status = 'published';

-- Comments for events
COMMENT ON TABLE events IS 'Core event information with lifecycle management';
COMMENT ON COLUMN events.slug IS 'URL-friendly unique identifier, immutable after creation';
COMMENT ON COLUMN events.capacity IS 'Maximum total attendees across all ticket types';
COMMENT ON COLUMN events.status IS 'Event lifecycle state: draft → published → cancelled/completed';
COMMENT ON CONSTRAINT end_after_start ON events IS 'INV-E-001: End date must be after start date';
COMMENT ON CONSTRAINT future_start_on_create ON events IS 'INV-E-002: Start date must be in future at creation';

-- ---------------------------------------------------------------------
-- Table: ticket_types
-- Purpose: Ticket categories with pricing and quota management
-- Constraints: INV-TT-001 to INV-TT-005
-- ---------------------------------------------------------------------
CREATE TABLE ticket_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 50),
    description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    available INTEGER NOT NULL CHECK (available >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT available_lte_quantity CHECK (available <= quantity),
    CONSTRAINT unique_ticket_name_per_event UNIQUE (event_id, name)
);

-- Indexes for ticket_types
CREATE INDEX idx_ticket_types_event_id ON ticket_types(event_id);
CREATE INDEX idx_ticket_types_available ON ticket_types(available) WHERE available > 0;

-- Comments for ticket_types
COMMENT ON TABLE ticket_types IS 'Ticket categories with pricing and quota management';
COMMENT ON COLUMN ticket_types.quantity IS 'Total tickets allocated to this type';
COMMENT ON COLUMN ticket_types.available IS 'Remaining tickets not yet sold (decremented atomically)';
COMMENT ON COLUMN ticket_types.price IS 'Price per ticket, 0 for free events';
COMMENT ON CONSTRAINT available_lte_quantity ON ticket_types IS 'INV-TT-001: Available must be <= quantity';

-- ---------------------------------------------------------------------
-- Table: registrations
-- Purpose: User ticket registrations (the "ticket" itself)
-- Constraints: INV-R-001 to INV-R-006
-- ---------------------------------------------------------------------
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    ticket_type_id UUID NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
    ticket_code UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    qr_data TEXT NOT NULL UNIQUE,
    status registration_status NOT NULL DEFAULT 'confirmed',
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_event_ticket_type UNIQUE (event_id, user_id, ticket_type_id),
    CONSTRAINT checked_in_at_requires_checked_in_status CHECK (
        (status = 'checked_in' AND checked_in_at IS NOT NULL) OR
        (status != 'checked_in' AND checked_in_at IS NULL)
    ),
    CONSTRAINT checked_in_by_requires_checked_in_status CHECK (
        (status = 'checked_in' AND checked_in_by IS NOT NULL) OR
        (status != 'checked_in' AND checked_in_by IS NULL)
    ),
    CONSTRAINT cancelled_at_requires_cancelled_status CHECK (
        (status = 'cancelled' AND cancelled_at IS NOT NULL) OR
        (status != 'cancelled' AND cancelled_at IS NULL)
    ),
    CONSTRAINT no_cancel_after_checkin CHECK (
        NOT (status = 'cancelled' AND checked_in_at IS NOT NULL)
    )
);

-- Indexes for registrations
CREATE INDEX idx_registrations_event_id ON registrations(event_id);
CREATE INDEX idx_registrations_user_id ON registrations(user_id);
CREATE INDEX idx_registrations_ticket_code ON registrations(ticket_code);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_confirmed ON registrations(event_id, status) 
    WHERE status = 'confirmed';

-- Comments for registrations
COMMENT ON TABLE registrations IS 'User ticket registrations with QR codes and check-in tracking';
COMMENT ON COLUMN registrations.ticket_code IS 'Human-readable unique identifier for customer service';
COMMENT ON COLUMN registrations.qr_data IS 'Encrypted payload: eventId:regId:timestamp:signature';
COMMENT ON COLUMN registrations.metadata IS 'Additional data like dietary restrictions, special requests';
COMMENT ON CONSTRAINT unique_user_event_ticket_type ON registrations IS 'INV-R-001: User cannot register twice for same event/ticket type';
COMMENT ON CONSTRAINT no_cancel_after_checkin ON registrations IS 'INV-R-004: Cannot cancel after check-in';

-- ---------------------------------------------------------------------
-- Table: check_ins
-- Purpose: Audit trail of all check-in attempts
-- Constraints: INV-CI-001 to INV-CI-003
-- ---------------------------------------------------------------------
CREATE TABLE check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    method checkin_method NOT NULL,
    location TEXT CHECK (location IS NULL OR char_length(location) <= 100),
    device_info JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT timestamp_not_future CHECK (timestamp <= NOW())
);

-- Indexes for check_ins
CREATE INDEX idx_check_ins_registration_id ON check_ins(registration_id);
CREATE INDEX idx_check_ins_staff_id ON check_ins(staff_id);
CREATE INDEX idx_check_ins_timestamp ON check_ins(timestamp);
CREATE INDEX idx_check_ins_event_stats ON check_ins(registration_id, timestamp);

-- Comments for check_ins
COMMENT ON TABLE check_ins IS 'Immutable audit trail of all check-in attempts (including duplicates)';
COMMENT ON COLUMN check_ins.method IS 'How check-in was performed: qr (scanned) or manual (searched)';
COMMENT ON COLUMN check_ins.device_info IS 'Browser/device metadata for debugging and analytics';
COMMENT ON CONSTRAINT timestamp_not_future ON check_ins IS 'INV-CI-001: Timestamp cannot be in future';

-- ---------------------------------------------------------------------
-- Table: staff_assignments
-- Purpose: Associates staff members with events they can manage
-- Constraints: INV-SA-001 to INV-SA-003
-- ---------------------------------------------------------------------
CREATE TABLE staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    role TEXT CHECK (role IS NULL OR char_length(role) <= 50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_staff_per_event UNIQUE (event_id, staff_id)
);

-- Indexes for staff_assignments
CREATE INDEX idx_staff_assignments_event_id ON staff_assignments(event_id);
CREATE INDEX idx_staff_assignments_staff_id ON staff_assignments(staff_id);

-- Comments for staff_assignments
COMMENT ON TABLE staff_assignments IS 'Links staff members to events they can check in attendees for';
COMMENT ON COLUMN staff_assignments.role IS 'Optional descriptive role like "Check-in Lead" or "Volunteer"';
COMMENT ON CONSTRAINT unique_staff_per_event ON staff_assignments IS 'INV-SA-001: Staff cannot be assigned twice to same event';

-- ---------------------------------------------------------------------
-- Table: event_reminders
-- Purpose: Tracks sent reminders to prevent duplicates
-- Constraints: INV-ER-001 to INV-ER-002
-- ---------------------------------------------------------------------
CREATE TABLE event_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    reminder_type reminder_type NOT NULL,
    recipient_count INTEGER NOT NULL CHECK (recipient_count >= 0),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
    
    -- Constraints
    CONSTRAINT unique_event_reminder_type UNIQUE (event_id, reminder_type)
);

-- Indexes for event_reminders
CREATE INDEX idx_event_reminders_event_id ON event_reminders(event_id);
CREATE INDEX idx_event_reminders_sent_at ON event_reminders(sent_at);

-- Comments for event_reminders
COMMENT ON TABLE event_reminders IS 'Tracks which reminder emails have been sent to prevent duplicates';
COMMENT ON COLUMN event_reminders.recipient_count IS 'Number of attendees who should receive reminder';
COMMENT ON COLUMN event_reminders.failed_count IS 'Number of failed email deliveries for retry logic';
COMMENT ON CONSTRAINT unique_event_reminder_type ON event_reminders IS 'INV-ER-001: Only one reminder of each type per event';

-- =====================================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================================

-- ---------------------------------------------------------------------
-- Function: update_updated_at_column
-- Purpose: Automatically update updated_at timestamp on row modification
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- Function: create_profile_for_new_user
-- Purpose: Automatically create profile when user signs up via Supabase Auth
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, email_verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email_confirmed_at IS NOT NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to auto-create profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_new_user();

-- ---------------------------------------------------------------------
-- Function: prevent_capacity_violation
-- Purpose: Enforce INV-E-004 - capacity cannot be reduced below registrations
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_capacity_violation()
RETURNS TRIGGER AS $$
DECLARE
    current_registrations INTEGER;
BEGIN
    -- Only check if capacity is being reduced
    IF NEW.capacity < OLD.capacity THEN
        SELECT COUNT(*)
        INTO current_registrations
        FROM registrations
        WHERE event_id = NEW.id AND status != 'cancelled';
        
        IF NEW.capacity < current_registrations THEN
            RAISE EXCEPTION 'Cannot reduce capacity below current registrations (%). Current: %, Requested: %',
                current_registrations, OLD.capacity, NEW.capacity
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_capacity_constraint
    BEFORE UPDATE ON events
    FOR EACH ROW
    WHEN (OLD.capacity IS DISTINCT FROM NEW.capacity)
    EXECUTE FUNCTION prevent_capacity_violation();

-- ---------------------------------------------------------------------
-- Function: validate_ticket_type_capacity
-- Purpose: Enforce INV-TT-004 - sum of ticket quantities cannot exceed event capacity
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_ticket_type_capacity()
RETURNS TRIGGER AS $$
DECLARE
    total_quantity INTEGER;
    event_capacity INTEGER;
BEGIN
    -- Get event capacity
    SELECT capacity INTO event_capacity
    FROM events
    WHERE id = NEW.event_id;
    
    -- Calculate total quantity including this new/updated ticket type
    SELECT COALESCE(SUM(quantity), 0) INTO total_quantity
    FROM ticket_types
    WHERE event_id = NEW.event_id AND id != COALESCE(NEW.id, uuid_nil());
    
    total_quantity := total_quantity + NEW.quantity;
    
    IF total_quantity > event_capacity THEN
        RAISE EXCEPTION 'Total ticket quantity (%) exceeds event capacity (%)',
            total_quantity, event_capacity
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_ticket_type_capacity
    BEFORE INSERT OR UPDATE ON ticket_types
    FOR EACH ROW
    EXECUTE FUNCTION validate_ticket_type_capacity();

-- ---------------------------------------------------------------------
-- Function: prevent_ticket_quantity_reduction
-- Purpose: Enforce INV-TT-003 - quantity cannot be reduced below sold count
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_ticket_quantity_reduction()
RETURNS TRIGGER AS $$
DECLARE
    sold_count INTEGER;
BEGIN
    -- Only check if quantity is being reduced
    IF NEW.quantity < OLD.quantity THEN
        sold_count := OLD.quantity - OLD.available;
        
        IF NEW.quantity < sold_count THEN
            RAISE EXCEPTION 'Cannot reduce quantity below sold tickets (%). Current: %, Requested: %',
                sold_count, OLD.quantity, NEW.quantity
                USING ERRCODE = 'check_violation';
        END IF;
        
        -- Adjust available count proportionally
        NEW.available := NEW.quantity - sold_count;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_ticket_quantity_constraint
    BEFORE UPDATE ON ticket_types
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
    EXECUTE FUNCTION prevent_ticket_quantity_reduction();

-- ---------------------------------------------------------------------
-- Function: validate_staff_role
-- Purpose: Enforce INV-SA-002 and INV-CI-002 - staff_id must have staff role
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_staff_role()
RETURNS TRIGGER AS $$
DECLARE
    user_role_value user_role;
BEGIN
    SELECT role INTO user_role_value
    FROM profiles
    WHERE id = NEW.staff_id;
    
    IF user_role_value NOT IN ('staff', 'admin') THEN
        RAISE EXCEPTION 'User must have staff or admin role to be assigned. Current role: %',
            user_role_value
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_staff_assignment_role
    BEFORE INSERT ON staff_assignments
    FOR EACH ROW
    EXECUTE FUNCTION validate_staff_role();

CREATE TRIGGER enforce_checkin_staff_role
    BEFORE INSERT ON check_ins
    FOR EACH ROW
    EXECUTE FUNCTION validate_staff_role();

-- ---------------------------------------------------------------------
-- Function: validate_organizer_assignment
-- Purpose: Enforce INV-SA-003 - only event organizer can assign staff
-- Note: This will be enforced at application level with RLS
-- ---------------------------------------------------------------------

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Profiles Policies
-- ---------------------------------------------------------------------

-- Anyone can view basic profile information
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Profiles are created via trigger (auth.users insert)
-- No direct INSERT policy needed

-- ---------------------------------------------------------------------
-- Events Policies
-- ---------------------------------------------------------------------

-- Anyone can read published events
CREATE POLICY "Published events are viewable by everyone"
ON events FOR SELECT
USING (status = 'published' OR auth.uid() = organizer_id);

-- Only organizers can create events (with their own organizer_id)
CREATE POLICY "Organizers can create events"
ON events FOR INSERT
WITH CHECK (
    auth.uid() = organizer_id AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('organizer', 'admin')
    )
);

-- Organizers can update their own events
CREATE POLICY "Organizers can update own events"
ON events FOR UPDATE
USING (auth.uid() = organizer_id)
WITH CHECK (auth.uid() = organizer_id);

-- Organizers can delete their own events (if no registrations exist)
CREATE POLICY "Organizers can delete own events"
ON events FOR DELETE
USING (
    auth.uid() = organizer_id AND
    NOT EXISTS (
        SELECT 1 FROM registrations
        WHERE event_id = events.id AND status != 'cancelled'
    )
);

-- ---------------------------------------------------------------------
-- Ticket Types Policies
-- ---------------------------------------------------------------------

-- Anyone can view ticket types for published events
CREATE POLICY "Ticket types are viewable for published events"
ON ticket_types FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = ticket_types.event_id
        AND (events.status = 'published' OR events.organizer_id = auth.uid())
    )
);

-- Organizers can manage ticket types for their events
CREATE POLICY "Organizers can manage ticket types"
ON ticket_types FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = ticket_types.event_id
        AND events.organizer_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = ticket_types.event_id
        AND events.organizer_id = auth.uid()
    )
);

-- ---------------------------------------------------------------------
-- Registrations Policies
-- ---------------------------------------------------------------------

-- Users can view their own registrations
CREATE POLICY "Users can view own registrations"
ON registrations FOR SELECT
USING (auth.uid() = user_id);

-- Event organizers can view registrations for their events
CREATE POLICY "Organizers can view event registrations"
ON registrations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = registrations.event_id
        AND events.organizer_id = auth.uid()
    )
);

-- Staff can view registrations for events they're assigned to
CREATE POLICY "Staff can view assigned event registrations"
ON registrations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM staff_assignments
        WHERE staff_assignments.event_id = registrations.event_id
        AND staff_assignments.staff_id = auth.uid()
    )
);

-- Users can create registrations for themselves
-- Note: Actual registration logic (capacity check, etc.) handled in stored procedure
CREATE POLICY "Users can create own registrations"
ON registrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own registrations
CREATE POLICY "Users can cancel own registrations"
ON registrations FOR UPDATE
USING (auth.uid() = user_id AND status = 'confirmed')
WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Check-ins Policies
-- ---------------------------------------------------------------------

-- Users can view their own check-ins
CREATE POLICY "Users can view own check-ins"
ON check_ins FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM registrations
        WHERE registrations.id = check_ins.registration_id
        AND registrations.user_id = auth.uid()
    )
);

-- Staff can view check-ins for events they're assigned to
CREATE POLICY "Staff can view assigned event check-ins"
ON check_ins FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM registrations r
        INNER JOIN staff_assignments sa ON sa.event_id = r.event_id
        WHERE r.id = check_ins.registration_id
        AND sa.staff_id = auth.uid()
    )
);

-- Organizers can view check-ins for their events
CREATE POLICY "Organizers can view event check-ins"
ON check_ins FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM registrations r
        INNER JOIN events e ON e.id = r.event_id
        WHERE r.id = check_ins.registration_id
        AND e.organizer_id = auth.uid()
    )
);

-- Staff can create check-ins for events they're assigned to
CREATE POLICY "Staff can create check-ins"
ON check_ins FOR INSERT
WITH CHECK (
    auth.uid() = staff_id AND
    EXISTS (
        SELECT 1 FROM registrations r
        INNER JOIN staff_assignments sa ON sa.event_id = r.event_id
        WHERE r.id = check_ins.registration_id
        AND sa.staff_id = auth.uid()
    )
);

-- ---------------------------------------------------------------------
-- Staff Assignments Policies
-- ---------------------------------------------------------------------

-- Staff can view their own assignments
CREATE POLICY "Staff can view own assignments"
ON staff_assignments FOR SELECT
USING (auth.uid() = staff_id);

-- Organizers can view assignments for their events
CREATE POLICY "Organizers can view event staff"
ON staff_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = staff_assignments.event_id
        AND events.organizer_id = auth.uid()
    )
);

-- Organizers can manage staff for their events
CREATE POLICY "Organizers can manage event staff"
ON staff_assignments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = staff_assignments.event_id
        AND events.organizer_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = staff_assignments.event_id
        AND events.organizer_id = auth.uid()
    )
);

-- ---------------------------------------------------------------------
-- Event Reminders Policies
-- ---------------------------------------------------------------------

-- Only system (service role) can manage reminders
-- Users cannot directly access this table
CREATE POLICY "Only service role can manage reminders"
ON event_reminders FOR ALL
USING (false); -- Deny all user access, only service role bypasses RLS

-- =====================================================================
-- HELPER VIEWS
-- =====================================================================

-- ---------------------------------------------------------------------
-- View: event_statistics
-- Purpose: Aggregate statistics for events (registrations, check-ins)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW event_statistics AS
SELECT
    e.id AS event_id,
    e.title,
    e.status,
    e.capacity,
    e.start_date,
    e.end_date,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status != 'cancelled') AS total_registrations,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'checked_in') AS total_checked_in,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'confirmed') AS awaiting_checkin,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'cancelled') AS cancelled_registrations,
    e.capacity - COUNT(DISTINCT r.id) FILTER (WHERE r.status != 'cancelled') AS available_capacity,
    ROUND(
        100.0 * COUNT(DISTINCT r.id) FILTER (WHERE r.status != 'cancelled') / NULLIF(e.capacity, 0),
        2
    ) AS capacity_percentage,
    ROUND(
        100.0 * COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'checked_in') /
        NULLIF(COUNT(DISTINCT r.id) FILTER (WHERE r.status != 'cancelled'), 0),
        2
    ) AS checkin_percentage
FROM events e
LEFT JOIN registrations r ON r.event_id = e.id
GROUP BY e.id;

COMMENT ON VIEW event_statistics IS 'Real-time aggregate statistics for events';

-- =====================================================================
-- SAMPLE DATA (for development/testing only)
-- =====================================================================
-- Uncomment the following section to insert sample data for testing
/*
-- Note: In production, users are created via Supabase Auth signup
-- For development, manually insert sample profiles:

INSERT INTO profiles (id, email, full_name, role, email_verified) VALUES
    ('00000000-0000-0000-0000-000000000001', 'organizer@example.com', 'Jane Organizer', 'organizer', true),
    ('00000000-0000-0000-0000-000000000002', 'staff@example.com', 'John Staff', 'staff', true),
    ('00000000-0000-0000-0000-000000000003', 'attendee@example.com', 'Alice Attendee', 'attendee', true);

-- Sample event
INSERT INTO events (id, organizer_id, title, slug, description, start_date, end_date, location, capacity, status) VALUES
    (
        '10000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        'Tech Conference 2026',
        'tech-conference-2026',
        'Annual gathering of tech enthusiasts',
        NOW() + INTERVAL '30 days',
        NOW() + INTERVAL '30 days' + INTERVAL '8 hours',
        'Convention Center, NYC',
        500,
        'published'
    );

-- Sample ticket types
INSERT INTO ticket_types (event_id, name, description, price, quantity, available) VALUES
    ('10000000-0000-0000-0000-000000000001', 'General Admission', 'Standard entry', 99.00, 400, 400),
    ('10000000-0000-0000-0000-000000000001', 'VIP', 'VIP access with perks', 299.00, 100, 100);
*/

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
