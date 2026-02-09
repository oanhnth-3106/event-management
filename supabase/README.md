# Supabase Database Documentation

## Overview

This directory contains the PostgreSQL schema and configuration for the Event Management System. The database uses Supabase as the backend-as-a-service platform, leveraging PostgreSQL with Row-Level Security (RLS) for authorization.

## Database Structure

### Core Tables

1. **profiles** - Extended user profile information (linked to `auth.users`)
2. **events** - Event information and lifecycle management
3. **ticket_types** - Ticket categories with pricing and quotas
4. **registrations** - User ticket registrations (the "tickets")
5. **check_ins** - Audit trail of check-in attempts
6. **staff_assignments** - Links staff to events they can manage
7. **event_reminders** - Tracks sent reminder emails

### Entity Relationships

```
profiles (1) ──organizes──> (N) events
events (1) ──has──> (N) ticket_types
ticket_types (1) ──allocated to──> (N) registrations
profiles (1) ──registers for──> (N) registrations
registrations (1) ──checked in via──> (N) check_ins
profiles (staff) (1) ──performs──> (N) check_ins
events (1) ──staffed by──> (N) staff_assignments
```

## Role-Based Access Control

### User Roles

The system implements a role hierarchy stored in `profiles.role`:

| Role          | Description                  | Assignment Method            |
| ------------- | ---------------------------- | ---------------------------- |
| **attendee**  | Default role for new users   | Automatic on signup          |
| **organizer** | Can create and manage events | Manual elevation by admin    |
| **staff**     | Can check in attendees       | Assigned by organizers       |
| **admin**     | Full system access           | Manual assignment (database) |

### Role Capabilities Matrix

| Capability               | Guest | Attendee | Organizer | Staff         | Admin |
| ------------------------ | ----- | -------- | --------- | ------------- | ----- |
| Browse published events  | ✅    | ✅       | ✅        | ✅            | ✅    |
| Register for events      | ❌    | ✅       | ✅        | ✅            | ✅    |
| View own tickets         | ❌    | ✅       | ✅        | ✅            | ✅    |
| Cancel own registration  | ❌    | ✅       | ✅        | ✅            | ✅    |
| Create events            | ❌    | ❌       | ✅        | ❌            | ✅    |
| Edit own events          | ❌    | ❌       | ✅        | ❌            | ✅    |
| View event registrations | ❌    | ❌       | ✅ (own)  | ✅ (assigned) | ✅    |
| Assign staff to events   | ❌    | ❌       | ✅ (own)  | ❌            | ✅    |
| Check in attendees       | ❌    | ❌       | ❌        | ✅ (assigned) | ✅    |
| View check-in stats      | ❌    | ❌       | ✅ (own)  | ✅ (assigned) | ✅    |
| Elevate user roles       | ❌    | ❌       | ❌        | ❌            | ✅    |

## Row-Level Security (RLS) Policies

All tables have RLS enabled. Policies enforce authorization at the database level, providing defense-in-depth security.

### Key RLS Assumptions

#### 1. Authentication Context

- **Session User**: Accessed via `auth.uid()` which returns the authenticated user's UUID
- **Service Role**: Can bypass RLS when using the service role key (used by backend commands)
- **Anonymous Users**: `auth.uid()` returns NULL, most policies deny access

#### 2. Profiles Table

**READ:**

- ✅ Anyone can read any profile (public information)

**UPDATE:**

- ✅ Users can update their own profile only
- ❌ Users cannot change their own role (must be done by admin via service role)

**INSERT:**

- Handled automatically via `auth.users` trigger

#### 3. Events Table

**READ:**

- ✅ Anyone can read published events
- ✅ Organizers can read their own events (any status)
- ❌ Others cannot see draft/cancelled events of other organizers

**CREATE:**

- ✅ Only users with `organizer` or `admin` role
- ✅ Can only create events with themselves as organizer

**UPDATE:**

- ✅ Organizers can update their own events only
- ❌ Cannot change `organizer_id` (immutable)

**DELETE:**

- ✅ Organizers can delete their own events
- ❌ Only if no non-cancelled registrations exist

#### 4. Ticket Types Table

**READ:**

- ✅ Anyone can view ticket types for published events
- ✅ Organizers can view ticket types for their own events (any status)

**CREATE/UPDATE/DELETE:**

- ✅ Organizers can manage ticket types for their own events only

#### 5. Registrations Table

**READ:**

- ✅ Users can view their own registrations
- ✅ Organizers can view registrations for their events
- ✅ Staff can view registrations for events they're assigned to
- ❌ Users cannot see other users' registrations (privacy)

**CREATE:**

- ✅ Authenticated users can create registrations for themselves
- ❌ Cannot create registrations for other users
- Note: Capacity checks enforced in stored procedure/command layer

**UPDATE:**

- ✅ Users can update their own registrations (for cancellation)
- ❌ Users cannot modify status to `checked_in` (only staff can)

**DELETE:**

- ❌ Soft delete only (status = 'cancelled')

#### 6. Check-ins Table

**READ:**

- ✅ Users can view their own check-ins
- ✅ Staff can view check-ins for events they're assigned to
- ✅ Organizers can view check-ins for their events

**CREATE:**

- ✅ Staff can create check-ins for events they're assigned to
- ✅ Must match their own `staff_id`
- ❌ Attendees cannot check themselves in

#### 7. Staff Assignments Table

**READ:**

- ✅ Staff can view their own assignments
- ✅ Organizers can view assignments for their events

**CREATE/UPDATE/DELETE:**

- ✅ Organizers can manage staff for their own events only
- ❌ Staff cannot assign themselves

#### 8. Event Reminders Table

**ALL OPERATIONS:**

- ❌ Denied to all users (RLS policy: `USING (false)`)
- ✅ Only service role can access (for automated reminder system)

## Database Triggers

### Auto-Generated Values

1. **Auto-create Profile**
   - **Trigger:** `on_auth_user_created`
   - **When:** After INSERT on `auth.users`
   - **Purpose:** Automatically creates a profile when user signs up
   - **Default Values:**
     - `role = 'attendee'`
     - `full_name` extracted from metadata or email
     - `email_verified` synced from auth

2. **Auto-update Timestamps**
   - **Trigger:** `update_profiles_updated_at`, `update_events_updated_at`
   - **When:** Before UPDATE on respective tables
   - **Purpose:** Automatically sets `updated_at = NOW()`

### Constraint Enforcement

3. **Prevent Capacity Violation**
   - **Trigger:** `enforce_capacity_constraint`
   - **When:** Before UPDATE on `events.capacity`
   - **Purpose:** Prevents reducing capacity below current registrations
   - **Error:** Raises exception if violated

4. **Validate Ticket Type Capacity**
   - **Trigger:** `enforce_ticket_type_capacity`
   - **When:** Before INSERT/UPDATE on `ticket_types`
   - **Purpose:** Ensures sum of all ticket quantities ≤ event capacity
   - **Error:** Raises exception if exceeded

5. **Prevent Ticket Quantity Reduction**
   - **Trigger:** `enforce_ticket_quantity_constraint`
   - **When:** Before UPDATE on `ticket_types.quantity`
   - **Purpose:** Prevents reducing quantity below sold tickets
   - **Error:** Raises exception if violated

6. **Validate Staff Role**
   - **Triggers:** `enforce_staff_assignment_role`, `enforce_checkin_staff_role`
   - **When:** Before INSERT on `staff_assignments`, `check_ins`
   - **Purpose:** Ensures `staff_id` references a user with `staff` or `admin` role
   - **Error:** Raises exception if user lacks required role

## Minimal Role-Based Access Assumptions

### Core Assumptions

#### A1. Role Immutability (for Users)

- **Assumption:** Regular users cannot change their own role
- **Enforcement:** RLS policies prevent users from updating `profiles.role`
- **Elevation:** Only admins can elevate roles via service role client
- **Rationale:** Prevents privilege escalation attacks

#### A2. Session Trust

- **Assumption:** `auth.uid()` accurately identifies the authenticated user
- **Enforcement:** Supabase Auth manages JWT tokens securely
- **Rationale:** All RLS policies depend on accurate user identification

#### A3. Service Role Bypass

- **Assumption:** Service role key is kept secret and only used by backend
- **Enforcement:** Environment variable protection, never exposed to client
- **Rationale:** Service role can bypass RLS for admin operations and commands

#### A4. Event Ownership Immutability

- **Assumption:** `events.organizer_id` cannot change after creation
- **Enforcement:** RLS WITH CHECK prevents modification
- **Rationale:** Prevents ownership transfer without audit trail

#### A5. Check-in Authority

- **Assumption:** Only assigned staff can check in attendees for specific events
- **Enforcement:** RLS checks existence in `staff_assignments` table
- **Rationale:** Prevents unauthorized check-ins

#### A6. Self-Registration Only

- **Assumption:** Users can only create registrations for themselves
- **Enforcement:** RLS checks `auth.uid() = user_id`
- **Rationale:** Prevents unauthorized ticket purchases on behalf of others

#### A7. Data Privacy

- **Assumption:** Users cannot see other users' registrations or personal data
- **Enforcement:** RLS filters queries to only return user's own data
- **Exceptions:** Organizers see registrations for their events, staff see assigned events
- **Rationale:** GDPR/privacy compliance

#### A8. Soft Delete for Audit

- **Assumption:** Critical records (events, registrations) are never hard-deleted
- **Enforcement:** Status flags (`status = 'cancelled'`)
- **Rationale:** Maintains audit trail and historical analytics

#### A9. Command Layer Authorization

- **Assumption:** Complex business rules checked in command layer, not just RLS
- **Example:** Capacity checks, time-based restrictions, state transitions
- **Enforcement:** Commands use service role and implement authorization logic
- **Rationale:** RLS handles data access, commands handle business logic

#### A10. Read-Write Separation

- **Assumption:** Reading data uses user's session (RLS enforced)
- **Assumption:** Writing data (commands) uses service role (business rules enforced)
- **Enforcement:** Architecture pattern in API routes
- **Rationale:** Separation of concerns between authorization and business logic

### Role Assignment Workflow

#### Making a User an Organizer

**Manual Process (Admin Required):**

```sql
-- Admin uses service role client
UPDATE profiles
SET role = 'organizer'
WHERE email = 'neworganizer@example.com';
```

**Future Enhancement:** Self-service organizer registration with verification

#### Making a User a Staff Member

**Two-Step Process:**

1. **Admin Elevates Role:**

   ```sql
   -- Admin uses service role client
   UPDATE profiles
   SET role = 'staff'
   WHERE email = 'newstaff@example.com';
   ```

2. **Organizer Assigns to Event:**
   ```sql
   -- Organizer uses regular client (RLS enforced)
   INSERT INTO staff_assignments (event_id, staff_id, assigned_by)
   VALUES (
     '10000000-0000-0000-0000-000000000001',
     'staff-user-uuid',
     auth.uid() -- Current organizer
   );
   ```

### Security Considerations

#### ✅ What RLS Protects Against

- Unauthorized data access (users seeing others' tickets)
- Privilege escalation (users changing their own role)
- Cross-tenant data leakage (organizers seeing other organizers' events)
- Direct database manipulation (all queries filtered by policies)

#### ⚠️ What RLS Does NOT Protect Against

- Business logic violations (capacity exceeded, invalid state transitions)
  - **Mitigation:** Enforce in command layer with proper transaction isolation
- Race conditions (two simultaneous registrations for last ticket)
  - **Mitigation:** Use SELECT FOR UPDATE in commands
- Application-layer authorization (which UI to show)
  - **Mitigation:** Backend validates all requests regardless of UI
- Denial of service attacks
  - **Mitigation:** Rate limiting at API gateway level

## Migration Usage

### Apply Migration

```bash
# Using Supabase CLI
supabase db reset  # Resets database and applies all migrations
supabase migration up  # Applies pending migrations only

# Or using SQL directly in Supabase Dashboard
# Copy contents of migration file and execute in SQL Editor
```

### Verify Migration

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

### Sample Data (Development Only)

The migration includes commented sample data. Uncomment the section at the end of the migration file to insert test data.

**Warning:** Do NOT use sample data in production.

## Best Practices

### For Application Code

1. **Use Supabase Client Correctly:**
   - **Server Components/API Routes:** Use server client (inherits user session, RLS enforced)
   - **Commands:** Use service client (bypasses RLS, implement authorization manually)

2. **Never Trust Client Input:**
   - Always validate on server side
   - RLS prevents unauthorized access, but not invalid data

3. **Transaction Management:**
   - Use transactions for multi-step operations (registration + decrement tickets)
   - Prevents partial updates on failure

4. **Service Role Security:**
   - Never expose service role key to client
   - Only use in server-side code
   - Implement authorization checks before using

### For Database Changes

1. **Use Migrations:**
   - Never modify production schema directly
   - Always create migration files
   - Version control all migrations

2. **Test RLS Policies:**
   - Test as different user types
   - Verify both positive and negative cases

3. **Maintain Audit Trail:**
   - Use soft deletes for important entities
   - Keep timestamp fields for all records

## Troubleshooting

### Common Issues

#### "Permission Denied" Errors

**Symptom:** Query returns empty or throws permission error

**Diagnosis:**

```sql
-- Check which policies apply to your query
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-uuid-here';

-- Test query
SELECT * FROM events;

-- Check active policies
SELECT * FROM pg_policies WHERE tablename = 'events';
```

**Solution:** Verify RLS policies match your use case, or use service role if business logic requires it.

#### "Check Constraint Violation"

**Symptom:** INSERT/UPDATE fails with constraint error

**Common Causes:**

- Capacity exceeded
- Ticket quantity below sold count
- Invalid state transition

**Solution:** Check trigger functions and table constraints in migration file.

#### "User Does Not Have Staff Role"

**Symptom:** Cannot assign staff or create check-ins

**Solution:**

```sql
-- Verify user role
SELECT id, email, role FROM profiles WHERE email = 'user@example.com';

-- Update role if needed (admin only)
UPDATE profiles SET role = 'staff' WHERE email = 'user@example.com';
```

## Next Steps

After applying this migration:

1. ✅ Set up Supabase project environment variables
2. ✅ Configure authentication providers (email/password, OAuth)
3. ✅ Test RLS policies with different user types
4. ✅ Implement command layer (business logic)
5. ✅ Create API routes that use this schema
6. ✅ Build frontend components

## References

- [Specification Document](../SPECIFICATION.md)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/triggers.html)
