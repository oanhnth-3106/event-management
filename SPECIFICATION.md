# Event Management System - Specification

**Version:** 1.0  
**Date:** February 5, 2026  
**Methodology:** Specification-Driven Development (SDD)

---

## 1. System Overview

### 1.1 Purpose

An event management platform that streamlines the complete event lifecycle: from creation and ticket distribution to attendee check-in and post-event analytics.

### 1.2 Core Capabilities

The system enables four primary workflows:

1. **Event Creation** - Organizers design events and configure ticketing options
2. **Registration** - Users discover events, register, and receive QR-coded tickets
3. **Check-In** - Staff validate and admit attendees by scanning QR codes
4. **Communication** - Automated reminders notify attendees before events begin

### 1.3 Technical Foundation

- **Frontend:** Next.js 14+ with App Router, TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Ticketing:** QR code-based electronic tickets with cryptographic validation
- **Architecture:** Full-stack monorepo with clear domain boundaries

### 1.4 Success Metrics

The system is successful when:

- Organizers can create and publish an event in under 5 minutes
- Users receive tickets immediately after registration
- Staff can check in attendees in under 3 seconds per scan
- System handles 1000+ concurrent check-ins without degradation

---

## 2. User Roles and Responsibilities

### 2.1 Actor Definitions

### 2.1 Actor Definitions

#### **Guest**

- **Who:** Unauthenticated visitor
- **Can Do:**
  - Browse public event listings
  - View event details (date, location, description, available tickets)
  - Search and filter events
- **Cannot Do:**
  - Register for events
  - Access user dashboard
  - Create events

#### **Attendee** (Registered User)

- **Who:** Authenticated user seeking to attend events
- **Can Do:**
  - All Guest capabilities
  - Register for published events
  - View "My Tickets" dashboard
  - Download QR tickets (digital/PDF)
  - Cancel own registrations (before event starts)
  - Receive email notifications (confirmation, reminders)
- **Cannot Do:**
  - Create or manage events
  - Access organizer tools
  - Perform check-ins

#### **Organizer**

- **Who:** User authorized to create and manage events
- **Can Do:**
  - All Attendee capabilities
  - Create events (draft mode)
  - Configure ticket types (name, price, quantity)
  - Publish/unpublish events
  - Edit event details (with constraints)
  - View attendee lists and statistics
  - Assign staff to events
  - Cancel events
  - Export registration data
- **Cannot Do:**
  - Check in attendees (requires Staff role)
  - Manage other organizers' events
  - Access system administration

#### **Staff**

- **Who:** Trusted personnel assigned to specific events for check-in duties
- **Can Do:**
  - All Attendee capabilities
  - Scan QR codes for assigned events
  - Manually check in attendees (fallback)
  - View real-time check-in statistics
  - Search attendee lists
- **Cannot Do:**
  - Modify event details
  - Create events
  - Check in attendees for unassigned events

#### **Admin**

- **Who:** System administrator with full privileges
- **Can Do:**
  - All system operations
  - Manage user roles
  - Access all events and data
  - System configuration
  - View global analytics
- **Scope:** Not part of MVP (Phase 1)

### 2.2 Authorization Matrix

| Capability            | Guest | Attendee | Organizer | Staff | Admin |
| --------------------- | ----- | -------- | --------- | ----- | ----- |
| Browse public events  | ✓     | ✓        | ✓         | ✓     | ✓     |
| View event details    | ✓     | ✓        | ✓         | ✓     | ✓     |
| Register for event    | —     | ✓        | ✓         | ✓     | ✓     |
| View my tickets       | —     | ✓        | ✓         | ✓     | ✓     |
| Cancel registration   | —     | ✓        | ✓         | ✓     | ✓     |
| Create event          | —     | —        | ✓         | —     | ✓     |
| Manage own events     | —     | —        | ✓         | —     | ✓     |
| Assign staff          | —     | —        | ✓         | —     | ✓     |
| Scan QR codes         | —     | —        | —         | ✓     | ✓     |
| Manual check-in       | —     | —        | —         | ✓     | ✓     |
| System administration | —     | —        | —         | —     | ✓     |

---

## 3. Core Domain Concepts

### 3.1 Bounded Contexts

The system is organized into three bounded contexts with clear responsibilities:

#### **Event Management Context**

- **Primary Entity:** `Event`
- **Supporting Entities:** `TicketType`, `EventCategory`
- **Responsibilities:**
  - Event lifecycle (create, draft, publish, cancel, complete)
  - Capacity and quota management
  - Ticket type configuration
  - Event metadata (title, description, dates, location, images)
- **Domain Events:**
  - `EventCreated`
  - `EventPublished`
  - `EventCancelled`
  - `CapacityChanged`

#### **Ticketing Context**

- **Primary Entity:** `Registration` (represents an issued ticket)
- **Supporting Entities:** `QRTicket`
- **Responsibilities:**
  - Registration processing
  - QR code generation and validation
  - Ticket status management (confirmed, checked-in, cancelled)
  - Duplicate registration prevention
- **Domain Events:**
  - `RegistrationCreated`
  - `TicketIssued`
  - `RegistrationCancelled`

#### **Access Control Context**

- **Primary Entity:** `CheckIn`
- **Supporting Entities:** `AttendeeRecord`
- **Responsibilities:**
  - QR code scanning and validation
  - Check-in status tracking
  - Duplicate check-in prevention
  - Attendance analytics
- **Domain Events:**
  - `AttendeeCheckedIn`
  - `CheckInAttemptFailed`
  - `ManualCheckInPerformed`

### 3.2 Domain Vocabulary

#### Event States

```
draft → published → [completed | cancelled]
```

- **draft**: Event created but not visible to public. Organizer can freely edit all fields.
- **published**: Event visible to attendees. Registrations accepted. Limited editing allowed.
- **completed**: Event has ended. Read-only. Historical data retained.
- **cancelled**: Event terminated. All tickets invalidated. Attendees notified.

#### Registration States

```
confirmed → [checked_in | cancelled]
```

- **confirmed**: Valid ticket, not yet used. QR code active.
- **checked_in**: Attendee admitted. QR code consumed. Timestamp recorded.
- **cancelled**: Ticket voided by attendee or system. Cannot check in.

#### Ticket Types

A **Ticket Type** defines a category of admission with:

- **name**: e.g., "General Admission", "VIP", "Early Bird"
- **price**: Amount in currency (0 for free events)
- **quantity**: Total tickets available for this type
- **available**: Remaining tickets (decrements on registration)

**Business Rule:** `available ≤ quantity` and `available ≥ 0`

#### QR Ticket

A **QR Ticket** is a cryptographically signed data structure containing:

- Event identifier
- Ticket/registration identifier
- Issuance timestamp
- HMAC signature (prevents forgery)

**Format:** `{eventId}:{registrationId}:{timestamp}:{signature}`

**Properties:**

- **Unique**: Each registration gets a unique QR code
- **Tamper-proof**: Signature validation prevents modification
- **Single-use**: Once scanned, status changes to `checked_in`
- **Verifiable**: Can be validated offline (with cached data)

### 3.3 Key Domain Rules

#### DR-001: Event Capacity

- Total registrations across all ticket types cannot exceed event capacity
- System prevents over-registration through atomic operations
- Organizer cannot reduce capacity below current registration count

#### DR-002: Registration Uniqueness

- A user can register at most once per event per ticket type
- Prevents duplicate registrations
- User may hold multiple ticket types for same event (if allowed)

#### DR-003: Event Editing Constraints

- Published events with registrations have restricted editing:
  - **Cannot change:** Event date/time within 48 hours of start
  - **Cannot change:** Reduce capacity below current registrations
  - **Can change:** Description, location (with attendee notification)
  - **Can change:** Add ticket types (not remove existing ones)

#### DR-004: Check-In Validation

QR code accepted only if ALL conditions met:

1. Signature is cryptographically valid
2. Event ID matches current scanning context
3. Registration exists in database
4. Registration status is `confirmed` (not already `checked_in`)
5. Current time is within event window (start - 2h to end + 2h)

#### DR-005: Ticket Cancellation

- Attendees can cancel confirmed registrations
- Cancellation deadline: Event start time - 1 hour
- Cancelled tickets return quota to ticket type `available` count
- No cancellation of checked-in tickets

### 3.4 Event Reminder System

**Purpose:** Reduce no-shows by sending automated reminders

**Trigger Schedule:**

- **24 hours before:** "Don't forget! Event tomorrow at {time}"
- **2 hours before:** "Starting soon! Your ticket is ready"

**Delivery Method:**

- Email to registered user's email address
- Contains: Event details, QR ticket image, location, time

**Business Rules:**

- Only sent to `confirmed` registrations (not cancelled or checked-in)
- If event cancelled, send cancellation notice instead
- Include unsubscribe option (user can opt-out of reminders)

---

## 4. User Flows and Domain Boundaries

This section defines the complete user journeys and system behaviors across all bounded contexts.

### 4.1 Organizer Flows

#### Flow O-001: Create and Publish Event

**Trigger:** Organizer clicks "Create New Event" button

**Preconditions:**

- User is authenticated
- User has Organizer role

**Steps:**

1. System displays event creation form
2. Organizer enters event details:
   - Title (required, min 5 chars, max 200 chars)
   - Description (optional, markdown supported, max 5000 chars)
   - Start date/time (required, must be future)
   - End date/time (required, must be after start)
   - Location (required, free text, max 500 chars)
   - Total capacity (required, positive integer)
   - Event image (optional, upload to Supabase Storage)
3. Organizer configures ticket types:
   - Add at least 1 ticket type
   - For each type: name, description, price (0 for free), quantity
   - Validate: sum(ticket_type.quantity) ≤ event.capacity
4. System validates all inputs
5. System creates event in **draft** status
6. System generates unique slug from title
7. System returns to event management page
8. **[Optional]** Organizer clicks "Publish" button
9. System validates required fields are complete
10. System changes status to **published**
11. System indexes event for public search

**Success Outcome:**

- Event created with UUID
- Event visible in organizer's dashboard
- If published: Event appears in public listings
- Organizer receives confirmation message
- System redirects to event detail page

**Failure Scenarios:**

| Condition                 | Error                                     | Recovery                                             |
| ------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| Title too short           | "Title must be at least 5 characters"     | User corrects input                                  |
| End date before start     | "End date must be after start date"       | User adjusts dates                                   |
| Capacity exceeded         | "Ticket quantities exceed total capacity" | User reduces ticket quantities or increases capacity |
| Image upload fails        | "Failed to upload image. Try again."      | User retries upload or skips image                   |
| Duplicate slug            | System appends random suffix              | Automatic recovery                                   |
| Network error during save | "Connection lost. Changes not saved."     | User retries submission                              |

**Domain Events Emitted:**

- `EventCreated(eventId, organizerId, timestamp)`
- `EventPublished(eventId, timestamp)` [if published]

---

#### Flow O-002: Edit Published Event

**Trigger:** Organizer clicks "Edit" on own event

**Preconditions:**

- User is authenticated as Organizer
- User owns the event (organizer_id = user.id)
- Event status is **published** or **draft**

**Steps:**

1. System loads event details into edit form
2. System applies editing constraints based on event state:
   - If no registrations: All fields editable
   - If registrations exist: Apply DR-003 constraints
   - If event starts within 48h: Date/time locked
3. Organizer modifies allowed fields
4. System validates changes
5. If major change (date, location):
   - System flags for attendee notification
   - Displays preview: "X attendees will be notified"
6. Organizer confirms changes
7. System saves updates
8. System sends notifications if flagged

**Success Outcome:**

- Event updated in database
- Organizer sees success message
- If applicable: Notification emails queued
- Updated event visible in listings

**Failure Scenarios:**

| Condition                               | Error                                                           | Recovery                                        |
| --------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| Reducing capacity below registrations   | "Cannot reduce capacity to X. Current registrations: Y"         | Increase capacity or cancel registrations first |
| Changing date within 48h window         | "Date locked. Event starts in less than 48 hours"               | Contact support or cancel event                 |
| Removing ticket type with registrations | "Cannot delete 'VIP' ticket type. Z registrations exist"        | Keep ticket type                                |
| Concurrent edit by another process      | "Event was modified by another session. Refresh and try again." | Reload page, reapply changes                    |

**Domain Events Emitted:**

- `EventUpdated(eventId, changes[], timestamp)`
- `AttendeesNotificationQueued(eventId, recipientCount, reason)` [if major change]

---

#### Flow O-003: View Attendee List and Statistics

**Trigger:** Organizer navigates to event's "Attendees" tab

**Preconditions:**

- User is authenticated as Organizer
- User owns the event

**Steps:**

1. System retrieves all registrations for event
2. System calculates statistics:
   - Total registered
   - Total checked in
   - Check-in rate (percentage)
   - Registrations by ticket type
   - Check-ins over time (hourly breakdown)
3. System displays attendee table:
   - Columns: Name, Email, Ticket Type, Status, Registration Date, Check-in Time
   - Sortable by any column
   - Filterable by status, ticket type
   - Searchable by name/email
4. System provides export option (CSV download)

**Success Outcome:**

- Organizer views real-time attendee data
- Statistics update automatically
- Export file downloads successfully

**Failure Scenarios:**

| Condition                   | Error                              | Recovery                 |
| --------------------------- | ---------------------------------- | ------------------------ |
| Large attendee list (>1000) | System paginates, shows warning    | Use filters or export    |
| Export generation fails     | "Export failed. Please try again." | Retry or contact support |

**Domain Events Emitted:**

- `AttendeeListViewed(eventId, organizerId, timestamp)`

---

#### Flow O-004: Cancel Event

**Trigger:** Organizer clicks "Cancel Event" button

**Preconditions:**

- User is authenticated as Organizer
- User owns the event
- Event status is **draft** or **published**

**Steps:**

1. System displays confirmation modal:
   - "Cancel '{event.title}'?"
   - "This will invalidate X tickets and notify all attendees"
   - Confirmation checkbox: "I understand this cannot be undone"
2. Organizer confirms cancellation
3. System begins atomic transaction:
   - Change event.status to **cancelled**
   - Change all registrations.status to **cancelled**
   - Queue cancellation emails to all attendees
   - Increment ticket_types.available (return quota)
4. System commits transaction
5. System displays success message
6. System redirects to organizer dashboard

**Success Outcome:**

- Event marked as cancelled
- All tickets invalidated
- Attendees receive cancellation emails within 5 minutes
- Event removed from public listings
- Historical data preserved (read-only)

**Failure Scenarios:**

| Condition                          | Error                                                                  | Recovery                   |
| ---------------------------------- | ---------------------------------------------------------------------- | -------------------------- |
| Event already started              | "Cannot cancel event that has already started"                         | N/A - cancellation blocked |
| Organizer doesn't confirm checkbox | Button remains disabled                                                | Check box to proceed       |
| Database transaction fails         | "Cancellation failed. Please try again."                               | Retry operation            |
| Email service unavailable          | Event cancelled but warning shown: "Some notifications may be delayed" | Emails retry automatically |

**Domain Events Emitted:**

- `EventCancelled(eventId, organizerId, registrationCount, timestamp)`
- `BulkNotificationQueued(eventId, recipientCount, type='cancellation')`

---

### 4.2 Attendee Flows

#### Flow A-001: Browse and Discover Events

**Trigger:** User visits home page or events listing

**Preconditions:**

- None (public access)

**Steps:**

1. System retrieves all **published** events (status = 'published')
2. System filters out:
   - Past events (end_date < now)
   - Cancelled events
   - Events at full capacity (if configured)
3. System displays events as cards:
   - Event image (or default placeholder)
   - Title, date, location
   - Available tickets remaining
   - "View Details" button
4. User applies filters (optional):
   - Date range picker
   - Location search/autocomplete
   - Category (if implemented)
5. User searches by keyword (searches title + description)
6. User clicks on event card

**Success Outcome:**

- User sees relevant, upcoming events
- User navigates to event detail page
- Fast load time (< 1s for 50 events)

**Failure Scenarios:**

| Condition            | Error                                                 | Recovery                       |
| -------------------- | ----------------------------------------------------- | ------------------------------ |
| No events found      | "No events match your search. Try different filters." | Clear filters or browse all    |
| Database unreachable | "Unable to load events. Please refresh."              | Retry with exponential backoff |

**Domain Events Emitted:**

- `EventListingViewed(userId?, filters, timestamp)`

---

#### Flow A-002: Register for Event

**Trigger:** Attendee clicks "Register" button on event detail page

**Preconditions:**

- User is authenticated (or prompted to sign in)
- Event status is **published**
- Event has available capacity
- User hasn't already registered for this event + ticket type

**Steps:**

1. System displays registration form:
   - Ticket type selector (if multiple types)
   - Confirms user's profile info (name, email, phone)
   - Terms acceptance checkbox
2. User selects ticket type
3. System validates in real-time:
   - Ticket type availability > 0
   - Event capacity not exceeded
   - No duplicate registration (user + event + ticket_type)
4. User clicks "Confirm Registration"
5. System begins atomic transaction:
   - Check capacity again (prevent race condition)
   - Create registration record (status = 'confirmed')
   - Generate unique ticket_code (UUID)
   - Generate QR data with signature
   - Decrement ticket_type.available
6. System commits transaction
7. System queues confirmation email with QR ticket
8. System displays success page with ticket preview

**Success Outcome:**

- Registration created with unique ticket_code
- QR ticket generated and stored
- Confirmation email sent within 60 seconds
- User redirected to "My Tickets" page
- Ticket immediately visible in dashboard

**Failure Scenarios:**

| Condition                          | Error                                                                | Recovery                               |
| ---------------------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| Event reached capacity             | "Sorry, this event is now full"                                      | Offer to browse other events           |
| Selected ticket type sold out      | "The 'VIP' tickets are sold out. Try another type."                  | Select different ticket type           |
| Duplicate registration detected    | "You've already registered for this event"                           | Show existing ticket                   |
| User not authenticated             | Redirect to login page with return URL                               | User signs in, returns to registration |
| Database deadlock (race condition) | "Registration failed. Please try again."                             | User retries (typically succeeds)      |
| QR generation fails                | Rollback transaction: "Registration failed. Try again."              | Full retry                             |
| Email send fails                   | Registration succeeds, ticket visible in dashboard, background retry | Email retries up to 3 times            |

**Domain Events Emitted:**

- `RegistrationCreated(registrationId, eventId, userId, ticketTypeId, timestamp)`
- `TicketIssued(registrationId, qrData, timestamp)`
- `ConfirmationEmailQueued(registrationId, recipientEmail)`

---

#### Flow A-003: View My Tickets

**Trigger:** Attendee clicks "My Tickets" in navigation

**Preconditions:**

- User is authenticated

**Steps:**

1. System retrieves all registrations for user (user_id = current_user)
2. System groups tickets by status:
   - **Upcoming**: status='confirmed', event.start_date > now
   - **Past**: status='checked_in' OR event.end_date < now
   - **Cancelled**: status='cancelled'
3. System displays each ticket card:
   - Event title, date, location
   - QR code (rendered as image)
   - Ticket status badge
   - "Download PDF" button
   - "Cancel Registration" button (if eligible)
4. User clicks on ticket to view full details

**Success Outcome:**

- User sees all registered events
- QR codes render correctly
- Ticket status is accurate
- PDF download works

**Failure Scenarios:**

| Condition               | Error                                           | Recovery                          |
| ----------------------- | ----------------------------------------------- | --------------------------------- |
| No registrations exist  | "You haven't registered for any events yet"     | Link to browse events             |
| QR code rendering fails | Display ticket_code as text fallback            | User can still show code manually |
| PDF generation fails    | "PDF temporarily unavailable. Try again later." | Retry or use digital ticket       |

**Domain Events Emitted:**

- `TicketsDashboardViewed(userId, ticketCount, timestamp)`

---

#### Flow A-004: Cancel Registration

**Trigger:** Attendee clicks "Cancel Registration" on ticket

**Preconditions:**

- User is authenticated
- User owns the registration
- Registration status is **confirmed**
- Current time < event.start_date - 1 hour (cancellation deadline)

**Steps:**

1. System displays confirmation modal:
   - "Cancel registration for '{event.title}'?"
   - "You won't be able to attend this event"
2. User confirms cancellation
3. System begins atomic transaction:
   - Change registration.status to **cancelled**
   - Increment ticket_type.available (return quota)
   - Invalidate QR code
4. System commits transaction
5. System sends cancellation confirmation email
6. System displays success message

**Success Outcome:**

- Registration cancelled
- Ticket quota returned to pool
- QR code no longer valid
- User receives confirmation email
- Ticket moves to "Cancelled" section

**Failure Scenarios:**

| Condition                       | Error                                              | Recovery                   |
| ------------------------------- | -------------------------------------------------- | -------------------------- |
| Past cancellation deadline      | "Cancellation deadline passed. Contact organizer." | N/A - cancellation blocked |
| Registration already checked in | "Cannot cancel checked-in ticket"                  | N/A - cancellation blocked |
| Event already started           | "Event has started. Cannot cancel."                | N/A - cancellation blocked |

**Domain Events Emitted:**

- `RegistrationCancelled(registrationId, eventId, userId, timestamp)`
- `TicketQuotaReturned(ticketTypeId, quantity=1)`

---

### 4.3 Staff (Check-In) Flows

#### Flow S-001: QR Code Check-In (Happy Path)

**Trigger:** Staff scans attendee's QR code

**Preconditions:**

- Staff is authenticated
- Staff is assigned to the event
- Camera permissions granted
- Network connectivity available

**Steps:**

1. Staff navigates to event's check-in page
2. System initializes camera (ZXing library)
3. System displays camera viewfinder
4. Staff positions camera over attendee's QR code
5. System detects and decodes QR data
6. System parses QR format: `{eventId}:{registrationId}:{timestamp}:{signature}`
7. System validates QR code (DR-004 rules):
   - Recompute signature, verify match
   - Verify eventId matches current context
   - Verify current time within event window
8. System queries database for registration
9. System validates registration status = 'confirmed'
10. System begins atomic transaction:
    - Update registration.status = 'checked_in'
    - Set registration.checked_in_at = now
    - Set registration.checked_in_by = staff.id
    - Insert check_ins record (method='qr')
11. System commits transaction
12. System displays success screen:
    - Green checkmark animation
    - Attendee name
    - Ticket type
    - "Welcome!" message
13. System plays success sound/haptic
14. System auto-returns to scanner in 2 seconds

**Success Outcome:**

- Attendee checked in successfully
- Registration status updated
- Check-in recorded in database
- Staff sees clear confirmation
- Ready for next scan immediately

**Failure Scenarios:**

| Condition              | Error                                              | System Response                    | Staff Action                                |
| ---------------------- | -------------------------------------------------- | ---------------------------------- | ------------------------------------------- |
| Invalid signature      | "Invalid QR code"                                  | Red X, error sound                 | Ask attendee for alternate verification     |
| Wrong event            | "This ticket is for '{other_event.title}'"         | Orange warning                     | Direct attendee to correct event            |
| Already checked in     | "Already checked in at {timestamp}"                | Yellow warning, show check-in time | Allow entry (duplicate scan) or investigate |
| Cancelled registration | "This ticket has been cancelled"                   | Red X                              | Verify attendee identity, contact organizer |
| Outside event window   | "Event check-in not yet open" or "Event has ended" | Orange warning                     | Use manual check-in if warranted            |
| QR decode fails        | "Cannot read QR code"                              | Prompt to retry or use manual      | Retry scan or manual lookup                 |
| Network error          | "Offline - caching check-in"                       | Yellow warning, local storage      | Syncs when connection restored              |
| Database error         | "Check-in failed. Try again."                      | Red X                              | Retry scan                                  |

**Domain Events Emitted:**

- `AttendeeCheckedIn(registrationId, staffId, method='qr', timestamp)`
- `CheckInValidationFailed(registrationId?, reason, timestamp)` [on failure]

---

#### Flow S-002: Manual Check-In (Fallback)

**Trigger:** Staff clicks "Manual Check-In" or QR scan repeatedly fails

**Preconditions:**

- Staff is authenticated and assigned to event
- QR scanning not feasible (damaged code, low light, camera issue)

**Steps:**

1. Staff clicks "Manual Check-In" button
2. System displays search interface
3. Staff enters attendee identifier:
   - Full name (autocomplete)
   - Email address
   - Ticket code (if attendee has it)
4. System searches registrations for event
5. System displays matching results:
   - Attendee name, email, ticket type
   - Current status (confirmed, checked_in, cancelled)
   - Photo (if available)
6. Staff selects correct attendee
7. System shows confirmation screen with attendee details
8. Staff verifies identity (e.g., check ID)
9. Staff clicks "Check In" button
10. System performs same validation as QR flow (steps 9-11 from S-001)
11. System marks method='manual' in check_ins record
12. System displays success confirmation

**Success Outcome:**

- Attendee checked in without QR scan
- Same database updates as QR flow
- Check-in method recorded as 'manual'
- Staff can quickly process next attendee

**Failure Scenarios:**

| Condition              | Error                                       | Recovery                                        |
| ---------------------- | ------------------------------------------- | ----------------------------------------------- |
| No matches found       | "No registration found for '{search_term}'" | Verify spelling, try email, check if registered |
| Multiple matches       | Display all matches with details            | Staff selects correct one                       |
| Already checked in     | Same as QR flow                             | Allow or investigate                            |
| Registration cancelled | Same as QR flow                             | Contact organizer                               |

**Domain Events Emitted:**

- `AttendeeCheckedIn(registrationId, staffId, method='manual', timestamp)`

---

#### Flow S-003: View Check-In Statistics (Real-Time)

**Trigger:** Staff navigates to event's "Stats" tab

**Preconditions:**

- Staff is authenticated and assigned to event

**Steps:**

1. System retrieves real-time statistics:
   - Total registrations (confirmed + checked_in)
   - Total checked in
   - Check-in rate (percentage)
   - Current occupancy
   - Check-ins per hour (last 6 hours)
2. System subscribes to Supabase Realtime channel for event
3. System displays dashboard:
   - Large numbers for key metrics
   - Progress bar (checked_in / total_registered)
   - Line chart (check-ins over time)
   - Recent check-ins list (last 10, streaming)
4. As new check-ins occur:
   - Metrics update automatically
   - Chart animates new data point
   - Recent list prepends new entry

**Success Outcome:**

- Staff sees live check-in progress
- No manual refresh needed
- Helps manage lines and resources

**Failure Scenarios:**

| Condition                     | Error                                      | Recovery                       |
| ----------------------------- | ------------------------------------------ | ------------------------------ |
| Realtime connection fails     | Fallback to polling (10s interval)         | Auto-reconnect when available  |
| Large event (>5000 attendees) | Paginate recent check-ins, aggregate chart | Performance remains acceptable |

**Domain Events Emitted:**

- `CheckInStatsViewed(eventId, staffId, timestamp)`

---

### 4.4 System-Initiated Flows

#### Flow SYS-001: Send Event Reminder (24h Before)

**Trigger:** Scheduled cron job runs every hour

**Preconditions:**

- Event status is **published**
- Event start_date is between 23-24 hours from now

**Steps:**

1. System queries events matching time window
2. For each matching event:
   - Query all registrations with status='confirmed'
   - Exclude users who opted out of reminders
3. For each eligible registration:
   - Generate email from template
   - Personalize with: user.name, event.title, event.start_date, event.location
   - Attach QR ticket image
   - Include map link to location
4. System queues emails in batch
5. System marks reminders as sent (to prevent duplicates)
6. Email service processes queue

**Success Outcome:**

- All confirmed attendees receive reminder 24h before event
- Emails delivered within 15 minutes of cron execution
- Reminder status logged

**Failure Scenarios:**

| Condition                | Error                                 | Recovery                                 |
| ------------------------ | ------------------------------------- | ---------------------------------------- |
| Email service down       | Emails remain in queue                | Retry every 10 minutes for up to 6 hours |
| Template rendering fails | Skip email, log error                 | Alert admin, manual intervention         |
| User email bounces       | Mark email as bounced, log            | No retry (user email invalid)            |
| Cron job fails           | Next hourly run catches missed events | Window is 23-24h, so 1h delay acceptable |

**Domain Events Emitted:**

- `ReminderSent(eventId, registrationId, reminderType='24h', timestamp)`
- `ReminderBatchCompleted(eventId, sentCount, failedCount, timestamp)`

---

#### Flow SYS-002: Send Event Reminder (2h Before)

**Trigger:** Scheduled cron job runs every 15 minutes

**Preconditions:**

- Event status is **published**
- Event start_date is between 1h 45m - 2h 15m from now

**Steps:**
1-6. Same as SYS-001, but with 2h reminder template

**Success Outcome:**

- Final reminder sent 2 hours before event
- Higher urgency messaging ("Starting soon!")

**Failure Scenarios:**

- Same as SYS-001

**Domain Events Emitted:**

- `ReminderSent(eventId, registrationId, reminderType='2h', timestamp)`

---

#### Flow SYS-003: Validate QR Code Signature

**Trigger:** QR code scanned (part of S-001, but worth specifying separately)

**Preconditions:**

- QR data successfully decoded from image

**Steps:**

1. System parses QR string: `{eventId}:{registrationId}:{timestamp}:{providedSignature}`
2. System extracts components
3. System reconstructs payload: `{eventId}:{registrationId}:{timestamp}`
4. System retrieves secret key from environment: `process.env.QR_SECRET_KEY`
5. System computes expected signature:
   ```
   expectedSignature = HMAC-SHA256(payload, secret_key)
   ```
6. System compares signatures (constant-time comparison to prevent timing attacks):
   ```
   if (expectedSignature === providedSignature) → VALID
   else → INVALID
   ```

**Success Outcome:**

- QR code cryptographically verified
- Continues to next validation step

**Failure Scenarios:**

| Condition           | Error                | Implication                    |
| ------------------- | -------------------- | ------------------------------ |
| Signature mismatch  | "Invalid QR code"    | QR was forged or corrupted     |
| Malformed QR format | "Unreadable QR code" | Not a valid ticket QR          |
| Secret key missing  | "System error"       | Configuration error (critical) |

**Domain Events Emitted:**

- `QRValidationCompleted(registrationId, isValid, timestamp)`
- `QRValidationFailed(qrData, reason, timestamp)` [if invalid]

---

#### Flow SYS-004: Auto-Complete Past Events

**Trigger:** Scheduled cron job runs daily at 2 AM UTC

**Preconditions:**

- Event status is **published**
- Event end_date < current_date (event has ended)

**Steps:**

1. System queries all published events with end_date in the past
2. For each event:
   - Change status to **completed**
   - Calculate final statistics:
     - Total registrations
     - Total check-ins
     - Attendance rate
   - Store in event_statistics table (for historical reporting)
3. System commits batch update
4. System logs completion

**Success Outcome:**

- Past events moved to completed status
- No longer appear in active listings
- Historical data preserved
- Statistics available for organizer review

**Failure Scenarios:**

| Condition                  | Error                     | Recovery                         |
| -------------------------- | ------------------------- | -------------------------------- |
| Database connection fails  | Log error, retry next day | Events will complete on next run |
| Large batch (1000+ events) | Process in chunks of 100  | Prevents timeout                 |

**Domain Events Emitted:**

- `EventAutoCompleted(eventId, stats, timestamp)`
- `EventCompletionBatchFinished(eventCount, timestamp)`

---

#### Flow SYS-005: Offline Check-In Sync

**Trigger:** Staff device regains network connectivity after offline period

**Preconditions:**

- Staff performed check-ins while offline
- Check-ins stored in browser's IndexedDB
- Network connection restored

**Steps:**

1. System detects online status change
2. System retrieves offline check-ins from local storage
3. For each cached check-in:
   - Attempt to sync to database
   - Validate registration still in valid state
   - If conflict (e.g., already checked in via another device):
     - Mark as duplicate
     - Preserve both records with conflict flag
4. System marks local records as synced
5. System displays sync summary to staff:
   - "X check-ins synced successfully"
   - "Y conflicts detected"

**Success Outcome:**

- All offline check-ins synchronized
- Database accurate
- Staff aware of sync status
- Conflicts logged for review

**Failure Scenarios:**

| Condition                          | Error                            | Recovery                     |
| ---------------------------------- | -------------------------------- | ---------------------------- |
| Sync fails for some records        | Retry failed records every 30s   | Alert staff after 3 failures |
| Registration deleted while offline | Skip sync, log orphaned check-in | Manual review required       |
| Clock skew on device               | Accept check-in but log warning  | Investigate device time      |

**Domain Events Emitted:**

- `OfflineCheckInSynced(registrationId, staffId, offlineTimestamp, syncTimestamp)`
- `OfflineSyncCompleted(eventId, syncedCount, conflictCount, timestamp)`

---

### 4.5 Domain Boundary Interactions

This section maps how the three bounded contexts interact through domain events and shared data.

#### Event Management → Ticketing Context

**Integration Points:**

1. **Event Published** → Enables registration
   - When: Event.status changes to 'published'
   - Data Shared: Event ID, capacity, ticket types
   - Effect: Ticketing context begins accepting registrations

2. **Event Cancelled** → Invalidates all tickets
   - When: Event.status changes to 'cancelled'
   - Data Shared: Event ID
   - Effect: All registrations for event set to 'cancelled'

3. **Capacity Changed** → Adjusts registration limits
   - When: Event.capacity updated
   - Data Shared: New capacity value
   - Effect: Ticketing context enforces new limit

**Anti-Corruption Layer:**

- Ticketing context never directly queries Event Management tables
- Communication via domain events or API calls
- Prevents tight coupling

#### Ticketing → Access Control Context

**Integration Points:**

1. **Ticket Issued** → Creates scannable QR code
   - When: Registration created
   - Data Shared: Registration ID, QR data
   - Effect: Access Control can validate this ticket

2. **Registration Cancelled** → QR code invalidated
   - When: Registration.status → 'cancelled'
   - Data Shared: Registration ID
   - Effect: Access Control rejects this QR code

**Anti-Corruption Layer:**

- Access Control context reads registration status but doesn't modify
- Check-in creates new entity (CheckIn) rather than mutating Registration
- Prevents bidirectional dependency

#### Access Control → Ticketing Context

**Integration Points:**

1. **Attendee Checked In** → Updates registration status
   - When: QR code successfully scanned
   - Data Shared: Registration ID, check-in timestamp, staff ID
   - Effect: Registration.status → 'checked_in', prevents re-entry

**Anti-Corruption Layer:**

- Single direction of flow: Check-in updates registration
- Access Control owns CheckIn entity
- Ticketing owns Registration entity

---

### 4.6 Flow Summary Matrix

| Flow ID | Actor          | Trigger              | Bounded Context  | Avg Duration | Failure Rate Target |
| ------- | -------------- | -------------------- | ---------------- | ------------ | ------------------- |
| O-001   | Organizer      | Click "Create Event" | Event Management | 3-5 min      | < 1%                |
| O-002   | Organizer      | Click "Edit Event"   | Event Management | 1-3 min      | < 2%                |
| O-003   | Organizer      | View Attendees       | Event Management | < 3 sec      | < 0.5%              |
| O-004   | Organizer      | Click "Cancel Event" | Event Management | 30 sec       | < 0.1%              |
| A-001   | Attendee/Guest | Visit homepage       | Event Management | < 2 sec      | < 0.5%              |
| A-002   | Attendee       | Click "Register"     | Ticketing        | 1-2 min      | < 3%                |
| A-003   | Attendee       | View My Tickets      | Ticketing        | < 1 sec      | < 0.5%              |
| A-004   | Attendee       | Cancel Registration  | Ticketing        | 20 sec       | < 1%                |
| S-001   | Staff          | Scan QR code         | Access Control   | 2-3 sec      | < 5%                |
| S-002   | Staff          | Manual check-in      | Access Control   | 30-60 sec    | < 2%                |
| S-003   | Staff          | View stats           | Access Control   | < 2 sec      | < 0.5%              |
| SYS-001 | System         | Cron (hourly)        | Ticketing        | Batch        | < 1%                |
| SYS-002 | System         | Cron (15 min)        | Ticketing        | Batch        | < 1%                |
| SYS-003 | System         | QR scanned           | Access Control   | < 100ms      | 0% (must succeed)   |
| SYS-004 | System         | Cron (daily)         | Event Management | Batch        | < 0.1%              |
| SYS-005 | System         | Network restored     | Access Control   | Variable     | < 5%                |

---

**Flow Specification Status:** COMPLETE  
**Next Step:** Define detailed API contracts and data schemas for each flow

---

## 4.7 Domain Commands (SpecKit-Style)

This section defines the core business commands using Specification-Driven Development principles. Each command represents an atomic business operation that enforces domain rules and maintains system invariants.

### Command Structure

Each command follows this template:

- **Command Name**: Unique identifier for the operation
- **Intent**: Business purpose and goal
- **Actor**: Who/what can execute this command
- **Bounded Context**: Which domain context owns this command
- **Inputs**: Required and optional parameters
- **Preconditions**: State requirements before execution
- **Steps**: Detailed execution sequence
- **Outputs**: Return values and side effects
- **Domain Events**: Events published after successful execution
- **Error Cases**: Failure scenarios with error codes

---

### CMD-001: CreateEvent

**Intent:** Initiate a new event in draft status, allowing the organizer to configure all details before publication.

**Actor:** Organizer

**Bounded Context:** Event Management

**Inputs:**

```typescript
{
  organizerId: UUID;           // Required: ID of the organizer creating the event
  title: string;               // Required: Event title (5-200 chars)
  description?: string;        // Optional: Event description (max 5000 chars, markdown)
  startDate: DateTime;         // Required: Event start (must be future)
  endDate: DateTime;           // Required: Event end (must be after start)
  location: string;            // Required: Event location (max 500 chars)
  capacity: number;            // Required: Total capacity (positive integer)
  imageFile?: File;            // Optional: Event cover image
}
```

**Preconditions:**

- User is authenticated
- User has Organizer role
- `startDate` is in the future
- `endDate` > `startDate`
- `capacity` > 0
- If `imageFile` provided: valid image format (JPEG, PNG, WebP), max 5MB

**Steps:**

1. **Validate** all input parameters against constraints
2. **Generate** unique slug from title:
   - Slugify: lowercase, replace spaces with hyphens
   - Check uniqueness in database
   - If duplicate: append random 4-character suffix
3. **Upload** image (if provided):
   - Store in Supabase Storage bucket: `event-images/{eventId}/{filename}`
   - Generate public URL
   - Set `imageUrl` field
4. **Create** event record:
   - `id`: Generate UUID
   - `organizerId`: From input
   - `status`: Set to 'draft'
   - `slug`: Generated slug
   - All other fields from input
   - `createdAt`, `updatedAt`: Current timestamp
5. **Persist** to database (events table)
6. **Return** event object

**Outputs:**

```typescript
{
  eventId: UUID;
  slug: string;
  status: 'draft';
  imageUrl?: string;
  createdAt: DateTime;
}
```

**Domain Events Emitted:**

- `EventCreated(eventId, organizerId, title, timestamp)`

**Error Cases:**

| Error Code             | Condition                 | HTTP Status | Message                                      |
| ---------------------- | ------------------------- | ----------- | -------------------------------------------- |
| `INVALID_TITLE_LENGTH` | title.length < 5 or > 200 | 400         | "Title must be between 5 and 200 characters" |
| `INVALID_DATE_RANGE`   | endDate ≤ startDate       | 400         | "End date must be after start date"          |
| `START_DATE_IN_PAST`   | startDate ≤ now           | 400         | "Start date must be in the future"           |
| `INVALID_CAPACITY`     | capacity ≤ 0              | 400         | "Capacity must be a positive integer"        |
| `IMAGE_TOO_LARGE`      | imageFile.size > 5MB      | 413         | "Image must be less than 5MB"                |
| `IMAGE_UPLOAD_FAILED`  | Storage error             | 500         | "Failed to upload image. Please try again."  |
| `UNAUTHORIZED`         | User not Organizer        | 403         | "Only organizers can create events"          |
| `DATABASE_ERROR`       | Persistence failure       | 500         | "Failed to create event. Please try again."  |

---

### CMD-002: ConfigureTicketType

**Intent:** Add or update a ticket type for an event, defining pricing and availability.

**Actor:** Organizer

**Bounded Context:** Event Management

**Inputs:**

```typescript
{
  eventId: UUID;               // Required: Event to configure
  ticketTypeId?: UUID;         // Optional: If updating existing type
  name: string;                // Required: Ticket type name (e.g., "VIP", "General")
  description?: string;        // Optional: Description of this ticket type
  price: Decimal;              // Required: Price (0 for free events)
  quantity: number;            // Required: Total tickets available for this type
}
```

**Preconditions:**

- User is authenticated as Organizer
- User owns the event (`event.organizerId === user.id`)
- Event status is 'draft' OR (status is 'published' AND operation is ADD, not UPDATE/DELETE)
- `price` ≥ 0
- `quantity` > 0
- If updating: `quantity` ≥ (original_quantity - available) [can't reduce below sold count]
- Sum of all ticket type quantities ≤ event.capacity

**Steps:**

1. **Validate** ownership and event status
2. **Validate** input parameters
3. **Check** capacity constraint:
   - Calculate: `totalAllocated` = sum of all ticket_types.quantity (excluding current if updating)
   - Validate: `totalAllocated + quantity ≤ event.capacity`
4. **Create or Update** ticket type:
   - If `ticketTypeId` provided: UPDATE existing record
   - Else: INSERT new record with generated UUID
   - Set `available = quantity` (for new) OR adjust `available` (for update)
5. **Persist** to database (ticket_types table)
6. **Return** ticket type object

**Outputs:**

```typescript
{
  ticketTypeId: UUID;
  eventId: UUID;
  name: string;
  price: Decimal;
  quantity: number;
  available: number;
}
```

**Domain Events Emitted:**

- `TicketTypeAdded(eventId, ticketTypeId, name, quantity, timestamp)` [if new]
- `TicketTypeUpdated(eventId, ticketTypeId, changes[], timestamp)` [if updated]

**Error Cases:**

| Error Code                      | Condition                            | HTTP Status | Message                                               |
| ------------------------------- | ------------------------------------ | ----------- | ----------------------------------------------------- |
| `EVENT_NOT_FOUND`               | Event doesn't exist                  | 404         | "Event not found"                                     |
| `UNAUTHORIZED`                  | User doesn't own event               | 403         | "You don't have permission to modify this event"      |
| `EVENT_PUBLISHED_CANNOT_MODIFY` | Updating/deleting type after publish | 400         | "Cannot modify ticket types after event is published" |
| `INVALID_PRICE`                 | price < 0                            | 400         | "Price cannot be negative"                            |
| `INVALID_QUANTITY`              | quantity ≤ 0                         | 400         | "Quantity must be positive"                           |
| `CAPACITY_EXCEEDED`             | Sum of quantities > event.capacity   | 400         | "Total ticket quantities exceed event capacity"       |
| `CANNOT_REDUCE_SOLD_TICKETS`    | New quantity < sold count            | 400         | "Cannot reduce quantity below already sold tickets"   |
| `DATABASE_ERROR`                | Persistence failure                  | 500         | "Failed to configure ticket type"                     |

---

### CMD-003: PublishEvent

**Intent:** Make a draft event publicly visible and enable registrations.

**Actor:** Organizer

**Bounded Context:** Event Management

**Inputs:**

```typescript
{
  eventId: UUID; // Required: Event to publish
  organizerId: UUID; // Required: Organizer requesting publication
}
```

**Preconditions:**

- User is authenticated as Organizer
- User owns the event (`event.organizerId === organizerId`)
- Event status is 'draft'
- Event has at least one ticket type configured
- All required fields are populated (title, description, start_date, end_date, location, capacity)
- Event start date is in the future

**Steps:**

1. **Validate** ownership
2. **Validate** event is in 'draft' status
3. **Validate** completeness:
   - Check all required fields present
   - Verify at least 1 ticket type exists
   - Confirm start_date > now
4. **Update** event status to 'published'
5. **Index** event for search:
   - Add to search index (if using Algolia/MeiliSearch)
   - Update published_at timestamp
6. **Persist** changes to database
7. **Return** updated event

**Outputs:**

```typescript
{
  eventId: UUID;
  status: "published";
  publishedAt: DateTime;
}
```

**Domain Events Emitted:**

- `EventPublished(eventId, organizerId, timestamp)`
- `RegistrationOpened(eventId, totalCapacity, ticketTypes[], timestamp)`

**Error Cases:**

| Error Code                | Condition                   | HTTP Status | Message                                                            |
| ------------------------- | --------------------------- | ----------- | ------------------------------------------------------------------ |
| `EVENT_NOT_FOUND`         | Event doesn't exist         | 404         | "Event not found"                                                  |
| `UNAUTHORIZED`            | User doesn't own event      | 403         | "Only the event organizer can publish this event"                  |
| `INVALID_STATUS`          | Event not in 'draft' status | 400         | "Only draft events can be published"                               |
| `MISSING_REQUIRED_FIELDS` | Required fields empty       | 400         | "Cannot publish: missing required fields (title, dates, location)" |
| `NO_TICKET_TYPES`         | No ticket types configured  | 400         | "Cannot publish: at least one ticket type required"                |
| `START_DATE_PASSED`       | start_date ≤ now            | 400         | "Cannot publish event with past start date"                        |
| `DATABASE_ERROR`          | Persistence failure         | 500         | "Failed to publish event"                                          |

---

### CMD-004: RegisterForEvent

**Intent:** Create a registration for an attendee, allocate a ticket, and generate a QR code.

**Actor:** Attendee

**Bounded Context:** Ticketing

**Inputs:**

```typescript
{
  eventId: UUID;               // Required: Event to register for
  userId: UUID;                // Required: User registering
  ticketTypeId: UUID;          // Required: Chosen ticket type
  metadata?: {                 // Optional: Additional registration data
    specialRequests?: string;
    emergencyContact?: string;
  };
}
```

**Preconditions:**

- User is authenticated
- Event status is 'published'
- Event start_date is in the future
- Selected ticket type has `available > 0`
- User has not already registered for this event + ticket type (check uniqueness)
- Total event registrations < event.capacity

**Steps:**

1. **Validate** user authentication and event status
2. **Lock** ticket type row (SELECT FOR UPDATE to prevent race conditions)
3. **Check** availability:
   - Verify `ticket_type.available > 0`
   - Verify total event registrations < `event.capacity`
4. **Check** duplicate registration:
   - Query: `WHERE event_id = ? AND user_id = ? AND ticket_type_id = ?`
   - If exists: Return error
5. **Generate** ticket code:
   - `ticketCode = UUID()`
6. **Generate** QR data (see CMD-005)
7. **Create** registration record:
   - `id`: Generate UUID
   - `status`: 'confirmed'
   - `ticket_code`: Generated UUID
   - `qr_data`: Generated QR string
   - `created_at`: Current timestamp
8. **Decrement** `ticket_type.available` by 1 (atomic update)
9. **Commit** transaction
10. **Queue** confirmation email (async)
11. **Return** registration object

**Outputs:**

```typescript
{
  registrationId: UUID;
  ticketCode: string;
  qrData: string;
  status: "confirmed";
  eventDetails: {
    title: string;
    startDate: DateTime;
    location: string;
  }
}
```

**Domain Events Emitted:**

- `RegistrationCreated(registrationId, eventId, userId, ticketTypeId, timestamp)`
- `TicketIssued(registrationId, ticketCode, qrData, timestamp)`
- `ConfirmationEmailQueued(registrationId, recipientEmail, timestamp)`

**Error Cases:**

| Error Code               | Condition                   | HTTP Status | Message                                    |
| ------------------------ | --------------------------- | ----------- | ------------------------------------------ |
| `EVENT_NOT_FOUND`        | Event doesn't exist         | 404         | "Event not found"                          |
| `EVENT_NOT_PUBLISHED`    | Event status != 'published' | 400         | "Event is not open for registration"       |
| `EVENT_PASSED`           | start_date ≤ now            | 400         | "Event has already started"                |
| `TICKET_TYPE_NOT_FOUND`  | Invalid ticket type ID      | 404         | "Ticket type not found"                    |
| `CAPACITY_EXCEEDED`      | event full                  | 409         | "Sorry, this event is now full"            |
| `TICKET_TYPE_SOLD_OUT`   | ticket_type.available = 0   | 409         | "This ticket type is sold out"             |
| `DUPLICATE_REGISTRATION` | User already registered     | 409         | "You've already registered for this event" |
| `UNAUTHENTICATED`        | User not logged in          | 401         | "Please sign in to register"               |
| `DATABASE_ERROR`         | Transaction failure         | 500         | "Registration failed. Please try again."   |

---

### CMD-005: GenerateTicketQRCode

**Intent:** Create a cryptographically signed QR code payload for a registration.

**Actor:** System (called by CMD-004)

**Bounded Context:** Ticketing

**Inputs:**

```typescript
{
  eventId: UUID; // Required: Event identifier
  registrationId: UUID; // Required: Registration identifier
  timestamp: number; // Required: Unix timestamp (seconds)
  secretKey: string; // Required: HMAC secret from environment
}
```

**Preconditions:**

- All inputs are valid UUIDs/numbers
- `secretKey` is configured in environment (`QR_SECRET_KEY`)
- `timestamp` is current time (prevents old QR codes)

**Steps:**

1. **Construct** payload string:
   ```
   payload = `${eventId}:${registrationId}:${timestamp}`
   ```
2. **Compute** HMAC signature:
   ```
   signature = HMAC-SHA256(payload, secretKey)
   ```
3. **Encode** signature to Base64 URL-safe format
4. **Construct** final QR data:
   ```
   qrData = `${payload}:${signature}`
   ```
5. **Return** QR data string

**Outputs:**

```typescript
{
  qrData: string; // Format: "eventId:registrationId:timestamp:signature"
}
```

**Domain Events Emitted:**

- None (pure function, no side effects)

**Error Cases:**

| Error Code           | Condition                   | HTTP Status | Message                                 |
| -------------------- | --------------------------- | ----------- | --------------------------------------- |
| `MISSING_SECRET_KEY` | QR_SECRET_KEY not in env    | 500         | "QR code generation not configured"     |
| `INVALID_INPUT`      | Malformed UUID or timestamp | 500         | "Invalid QR code generation parameters" |
| `CRYPTOGRAPHY_ERROR` | HMAC computation fails      | 500         | "QR code generation failed"             |

---

### CMD-006: CheckInTicket

**Intent:** Validate a QR code and mark an attendee as checked in, recording entry time and staff member.

**Actor:** Staff

**Bounded Context:** Access Control

**Inputs:**

```typescript
{
  qrData: string;              // Required: Scanned QR code data
  eventId: UUID;               // Required: Current event context (from scanner page)
  staffId: UUID;               // Required: Staff member performing check-in
  method: 'qr' | 'manual';     // Required: Check-in method
  location?: string;           // Optional: Check-in location (e.g., "Main Entrance")
}
```

**Preconditions:**

- Staff is authenticated
- Staff is assigned to this event
- If method='qr': QR data is valid format
- Network connectivity (or offline cache available)

**Steps:**

1. **Parse** QR data:
   ```
   [eventIdFromQR, registrationId, timestamp, providedSignature] = qrData.split(':')
   ```
2. **Validate** QR format (4 parts, valid UUIDs)
3. **Verify** signature (see CMD-007):
   - Recompute expected signature
   - Compare with `providedSignature` (constant-time comparison)
   - If mismatch: Return `INVALID_QR_CODE` error
4. **Verify** event match:
   - Check `eventIdFromQR === eventId`
   - If mismatch: Return `WRONG_EVENT` error
5. **Verify** time window:
   - Current time must be within `event.start_date - 2h` to `event.end_date + 2h`
   - If outside: Return `OUTSIDE_EVENT_WINDOW` error
6. **Query** registration by ID
7. **Validate** registration status:
   - If status = 'cancelled': Return `TICKET_CANCELLED` error
   - If status = 'checked_in': Return `ALREADY_CHECKED_IN` warning (with timestamp)
   - If status = 'confirmed': Proceed
8. **Begin** transaction:
   - Update `registration.status = 'checked_in'`
   - Set `registration.checked_in_at = now()`
   - Set `registration.checked_in_by = staffId`
   - Insert `check_ins` record
9. **Commit** transaction
10. **Return** success with attendee details

**Outputs:**

```typescript
{
  success: true;
  registration: {
    id: UUID;
    attendeeName: string;
    ticketType: string;
    checkedInAt: DateTime;
  }
  message: "Welcome!";
}
```

**Domain Events Emitted:**

- `AttendeeCheckedIn(registrationId, eventId, staffId, method, timestamp)`

**Error Cases:**

| Error Code               | Condition              | HTTP Status | Message                                | UI Treatment          |
| ------------------------ | ---------------------- | ----------- | -------------------------------------- | --------------------- |
| `INVALID_QR_FORMAT`      | QR parsing fails       | 400         | "Invalid QR code format"               | Red X                 |
| `INVALID_QR_CODE`        | Signature mismatch     | 400         | "Invalid QR code"                      | Red X, error sound    |
| `WRONG_EVENT`            | eventId mismatch       | 400         | "This ticket is for '{eventTitle}'"    | Orange warning        |
| `OUTSIDE_EVENT_WINDOW`   | Time check fails       | 400         | "Check-in not available at this time"  | Orange warning        |
| `REGISTRATION_NOT_FOUND` | Invalid registrationId | 404         | "Registration not found"               | Red X                 |
| `TICKET_CANCELLED`       | status = 'cancelled'   | 400         | "This ticket has been cancelled"       | Red X                 |
| `ALREADY_CHECKED_IN`     | status = 'checked_in'  | 409         | "Already checked in at {time}"         | Yellow warning        |
| `UNAUTHORIZED`           | Staff not assigned     | 403         | "You're not authorized for this event" | Red X                 |
| `DATABASE_ERROR`         | Transaction fails      | 500         | "Check-in failed. Try again."          | Red X, retry prompt   |
| `NETWORK_ERROR`          | Offline, no cache      | 503         | "Offline - caching check-in"           | Yellow warning, queue |

---

### CMD-007: ValidateQRSignature

**Intent:** Cryptographically verify the authenticity of a QR code to prevent forgery.

**Actor:** System (called by CMD-006)

**Bounded Context:** Access Control

**Inputs:**

```typescript
{
  qrData: string; // Required: Full QR code data
  secretKey: string; // Required: HMAC secret from environment
}
```

**Preconditions:**

- `qrData` is in correct format: `eventId:registrationId:timestamp:signature`
- `secretKey` matches the key used during generation (CMD-005)

**Steps:**

1. **Parse** QR data:
   ```
   [eventId, registrationId, timestamp, providedSignature] = qrData.split(':')
   ```
2. **Reconstruct** payload:
   ```
   payload = `${eventId}:${registrationId}:${timestamp}`
   ```
3. **Compute** expected signature:
   ```
   expectedSignature = HMAC-SHA256(payload, secretKey)
   ```
4. **Encode** to Base64 URL-safe
5. **Compare** signatures using constant-time comparison (prevents timing attacks):
   ```
   isValid = crypto.timingSafeEqual(expectedSignature, providedSignature)
   ```
6. **Return** validation result

**Outputs:**

```typescript
{
  isValid: boolean;
  eventId?: UUID;              // Only if valid
  registrationId?: UUID;       // Only if valid
  timestamp?: number;          // Only if valid
}
```

**Domain Events Emitted:**

- `QRValidationCompleted(registrationId, isValid, timestamp)`
- `QRValidationFailed(qrData, reason, timestamp)` [if invalid]

**Error Cases:**

| Error Code           | Condition                    | HTTP Status | Message                                     |
| -------------------- | ---------------------------- | ----------- | ------------------------------------------- |
| `MALFORMED_QR`       | Parse fails                  | 400         | "Malformed QR code"                         |
| `SIGNATURE_MISMATCH` | Signatures don't match       | 400         | "Invalid signature - QR code may be forged" |
| `MISSING_SECRET_KEY` | QR_SECRET_KEY not configured | 500         | "QR validation not configured"              |
| `CRYPTOGRAPHY_ERROR` | HMAC computation fails       | 500         | "QR validation failed"                      |

---

### CMD-008: SendEventReminder

**Intent:** Send automated reminder emails to confirmed attendees before event start.

**Actor:** System (scheduled cron job)

**Bounded Context:** Ticketing

**Inputs:**

```typescript
{
  eventId: UUID; // Required: Event to send reminders for
  reminderType: "24h" | "2h"; // Required: Which reminder (24h or 2h before)
  currentTime: DateTime; // Required: Current timestamp for time window calculation
}
```

**Preconditions:**

- Event status is 'published'
- Current time is within appropriate window:
  - For '24h': 23h-24h before event.start_date
  - For '2h': 1h45m-2h15m before event.start_date
- Reminder of this type has not been sent for this event (check sent flag)

**Steps:**

1. **Validate** event status and time window
2. **Check** if reminder already sent:
   - Query `event_reminders` table for existing record
   - If exists: Skip (idempotency check)
3. **Query** eligible registrations:
   ```sql
   SELECT * FROM registrations
   WHERE event_id = ?
   AND status = 'confirmed'
   AND user.reminder_opt_out = false
   ```
4. **For each** registration:
   - Load user profile (name, email)
   - Load event details
   - Generate email from template:
     - Subject: "Reminder: {event.title} {timeframe}"
     - Body: Personalized message with event details
     - Attachment: QR ticket image
     - Include: Map link, cancellation link
   - Queue email for delivery
5. **Record** reminder sent:
   - Insert into `event_reminders` table
   - Store: eventId, reminderType, sentAt, recipientCount
6. **Return** batch summary

**Outputs:**

```typescript
{
  eventId: UUID;
  reminderType: "24h" | "2h";
  recipientCount: number;
  queuedAt: DateTime;
}
```

**Domain Events Emitted:**

- `ReminderBatchQueued(eventId, reminderType, recipientCount, timestamp)`
- `ReminderSent(eventId, registrationId, reminderType, timestamp)` [per recipient]

**Error Cases:**

| Error Code               | Condition                            | HTTP Status | Message                                       |
| ------------------------ | ------------------------------------ | ----------- | --------------------------------------------- |
| `EVENT_NOT_FOUND`        | Event doesn't exist                  | 404         | "Event not found"                             |
| `EVENT_NOT_PUBLISHED`    | Event not published                  | 400         | "Cannot send reminders for unpublished event" |
| `OUTSIDE_TIME_WINDOW`    | Current time outside reminder window | 400         | "Not within reminder time window"             |
| `ALREADY_SENT`           | Reminder already sent                | 409         | "Reminder already sent for this event"        |
| `NO_ELIGIBLE_RECIPIENTS` | No confirmed registrations           | 200         | "No eligible recipients"                      |
| `EMAIL_SERVICE_ERROR`    | Email provider unavailable           | 503         | "Email service unavailable - will retry"      |
| `TEMPLATE_ERROR`         | Email template rendering fails       | 500         | "Failed to generate emails"                   |

---

### CMD-009: CancelEvent

**Intent:** Cancel a published event, invalidate all tickets, and notify all attendees.

**Actor:** Organizer

**Bounded Context:** Event Management

**Inputs:**

```typescript
{
  eventId: UUID;               // Required: Event to cancel
  organizerId: UUID;           // Required: Organizer requesting cancellation
  reason?: string;             // Optional: Cancellation reason (shared with attendees)
}
```

**Preconditions:**

- User is authenticated as Organizer
- User owns the event (`event.organizerId === organizerId`)
- Event status is 'draft' or 'published'
- Event start_date is in the future (cannot cancel already-started events)

**Steps:**

1. **Validate** ownership and status
2. **Check** event hasn't started:
   - If `event.start_date ≤ now`: Return error
3. **Begin** atomic transaction:
   - Update `event.status = 'cancelled'`
   - Update `event.cancelled_at = now()`
   - Update all registrations: `status = 'cancelled'`
   - Return ticket quotas: `ticket_type.available += sold_count`
4. **Query** all affected registrations for notification
5. **Queue** cancellation emails:
   - For each registration:
     - Load user email
     - Generate cancellation email
     - Include: Event details, cancellation reason (if provided)
     - Include: Organizer contact info
6. **Commit** transaction
7. **Remove** from public listings/search index
8. **Return** cancellation summary

**Outputs:**

```typescript
{
  eventId: UUID;
  status: "cancelled";
  cancelledAt: DateTime;
  affectedRegistrations: number;
  notificationStatus: "queued" | "failed";
}
```

**Domain Events Emitted:**

- `EventCancelled(eventId, organizerId, reason, registrationCount, timestamp)`
- `BulkNotificationQueued(eventId, recipientCount, type='cancellation', timestamp)`
- `TicketQuotasRestored(eventId, ticketTypes[], timestamp)`

**Error Cases:**

| Error Code              | Condition                         | HTTP Status | Message                                                |
| ----------------------- | --------------------------------- | ----------- | ------------------------------------------------------ |
| `EVENT_NOT_FOUND`       | Event doesn't exist               | 404         | "Event not found"                                      |
| `UNAUTHORIZED`          | User doesn't own event            | 403         | "Only the event organizer can cancel this event"       |
| `INVALID_STATUS`        | Event already cancelled/completed | 400         | "Event cannot be cancelled (current status: {status})" |
| `EVENT_ALREADY_STARTED` | start_date ≤ now                  | 400         | "Cannot cancel event that has already started"         |
| `DATABASE_ERROR`        | Transaction failure               | 500         | "Failed to cancel event. Please try again."            |
| `NOTIFICATION_ERROR`    | Email queueing fails              | 207         | "Event cancelled but some notifications failed"        |

---

### CMD-010: CancelRegistration

**Intent:** Allow an attendee to cancel their registration before the event, freeing up the ticket for others.

**Actor:** Attendee

**Bounded Context:** Ticketing

**Inputs:**

```typescript
{
  registrationId: UUID;        // Required: Registration to cancel
  userId: UUID;                // Required: User requesting cancellation
  reason?: string;             // Optional: Cancellation reason (for analytics)
}
```

**Preconditions:**

- User is authenticated
- User owns the registration (`registration.userId === userId`)
- Registration status is 'confirmed'
- Current time < event.start_date - 1 hour (cancellation deadline)

**Steps:**

1. **Validate** ownership
2. **Load** registration with related event details
3. **Check** cancellation deadline:
   - Calculate: `deadline = event.start_date - 1 hour`
   - If `now() >= deadline`: Return error
4. **Validate** status is 'confirmed':
   - If already 'cancelled': Return error
   - If 'checked_in': Return error (cannot cancel after check-in)
5. **Begin** transaction:
   - Update `registration.status = 'cancelled'`
   - Update `registration.cancelled_at = now()`
   - Increment `ticket_type.available += 1` (return quota)
6. **Commit** transaction
7. **Queue** confirmation email to user
8. **Return** cancellation confirmation

**Outputs:**

```typescript
{
  registrationId: UUID;
  status: 'cancelled';
  cancelledAt: DateTime;
  refundAmount?: Decimal;      // For future paid events
}
```

**Domain Events Emitted:**

- `RegistrationCancelled(registrationId, eventId, userId, reason, timestamp)`
- `TicketQuotaReturned(ticketTypeId, quantity=1, timestamp)`
- `CancellationConfirmationQueued(registrationId, recipientEmail, timestamp)`

**Error Cases:**

| Error Code                     | Condition                     | HTTP Status | Message                                                      |
| ------------------------------ | ----------------------------- | ----------- | ------------------------------------------------------------ |
| `REGISTRATION_NOT_FOUND`       | Invalid ID                    | 404         | "Registration not found"                                     |
| `UNAUTHORIZED`                 | User doesn't own registration | 403         | "You can only cancel your own registrations"                 |
| `ALREADY_CANCELLED`            | status = 'cancelled'          | 409         | "This registration is already cancelled"                     |
| `CANNOT_CANCEL_CHECKED_IN`     | status = 'checked_in'         | 400         | "Cannot cancel a ticket that's already been used"            |
| `CANCELLATION_DEADLINE_PASSED` | Past deadline                 | 400         | "Cancellation deadline has passed. Contact event organizer." |
| `EVENT_STARTED`                | Event already started         | 400         | "Event has started. Cannot cancel registration."             |
| `DATABASE_ERROR`               | Transaction fails             | 500         | "Cancellation failed. Please try again."                     |

---

### 4.8 Command Execution Patterns

#### Synchronous vs Asynchronous

**Synchronous Commands** (return result immediately):

- CMD-001: CreateEvent
- CMD-002: ConfigureTicketType
- CMD-003: PublishEvent
- CMD-004: RegisterForEvent
- CMD-005: GenerateTicketQRCode
- CMD-006: CheckInTicket
- CMD-007: ValidateQRSignature
- CMD-009: CancelEvent
- CMD-010: CancelRegistration

**Asynchronous Commands** (queued for background processing):

- CMD-008: SendEventReminder (triggered by cron)

#### Transaction Boundaries

All commands that modify state use database transactions:

```typescript
// Pseudo-code pattern
async function executeCommand(command: Command) {
  const transaction = await db.beginTransaction();

  try {
    // 1. Validate preconditions
    await validatePreconditions(command);

    // 2. Execute domain logic
    const result = await executeBusinessLogic(command, transaction);

    // 3. Emit domain events
    await emitEvents(result.events);

    // 4. Commit transaction
    await transaction.commit();

    return result;
  } catch (error) {
    await transaction.rollback();
    throw mapToErrorCode(error);
  }
}
```

#### Idempotency

Commands that must be idempotent (safe to retry):

- CMD-006: CheckInTicket (duplicate check-in returns warning, not error)
- CMD-008: SendEventReminder (checks sent flag before sending)
- CMD-009: CancelEvent (cancelling already-cancelled event returns current state)

#### Command Authorization

All commands verify authorization:

```typescript
// Authorization pattern
function authorizeCommand(command: Command, user: User) {
  switch (command.type) {
    case "CreateEvent":
      return user.role === "organizer";
    case "PublishEvent":
      return user.role === "organizer" && user.id === command.organizerId;
    case "RegisterForEvent":
      return user.isAuthenticated;
    case "CheckInTicket":
      return user.role === "staff" && isAssignedToEvent(user, command.eventId);
    // ... etc
  }
}
```

---

**Command Specification Status:** COMPLETE  
**Total Commands Defined:** 10  
**Next Step:** Define API endpoint mappings and request/response schemas

---

## 4.9 Conceptual Data Model

This section defines the domain entities, their attributes, relationships, and behavioral constraints. This is a **conceptual model** - platform-agnostic and implementation-independent.

### 4.9.1 Core Entities

---

#### **Entity: User**

**Purpose:** Represents a person using the system in any capacity.

**Attributes:**

| Attribute        | Type        | Constraints                  | Description                                               |
| ---------------- | ----------- | ---------------------------- | --------------------------------------------------------- |
| `id`             | UUID        | Primary Key, Immutable       | Unique identifier                                         |
| `email`          | Email       | Unique, Required             | User's email address for authentication and notifications |
| `fullName`       | String      | Required, 2-100 chars        | User's display name                                       |
| `phone`          | PhoneNumber | Optional                     | Contact phone number                                      |
| `role`           | Enum        | Required, Default='attendee' | User's primary role: attendee, organizer, staff, admin    |
| `avatarUrl`      | URL         | Optional                     | Profile picture URL                                       |
| `emailVerified`  | Boolean     | Required, Default=false      | Whether email is confirmed                                |
| `reminderOptOut` | Boolean     | Required, Default=false      | User preference to skip event reminders                   |
| `createdAt`      | DateTime    | Required, Immutable          | Account creation timestamp                                |
| `updatedAt`      | DateTime    | Required, Auto-updated       | Last profile modification timestamp                       |

**Invariants:**

- `INV-U-001`: Email must be unique across all users
- `INV-U-002`: Email must be verified before user can register for events
- `INV-U-003`: Role can be elevated (attendee → organizer) but not downgraded without admin action
- `INV-U-004`: Phone number must be valid E.164 format if provided

**Business Rules:**

- `BR-U-001`: User can have only one primary role, but can act in multiple capacities (e.g., organizer who also attends events)
- `BR-U-002`: Deletion requires cascade: cancel all registrations, transfer event ownership (if organizer)

---

#### **Entity: Event**

**Purpose:** Represents a scheduled gathering with ticketing and check-in capabilities.

**Attributes:**

| Attribute     | Type     | Constraints                             | Description                                           |
| ------------- | -------- | --------------------------------------- | ----------------------------------------------------- |
| `id`          | UUID     | Primary Key, Immutable                  | Unique identifier                                     |
| `organizerId` | UUID     | Foreign Key → User, Required, Immutable | Event creator/owner                                   |
| `title`       | String   | Required, 5-200 chars                   | Event name                                            |
| `slug`        | String   | Unique, Required, Immutable             | URL-friendly identifier                               |
| `description` | Markdown | Optional, Max 5000 chars                | Event details, supports markdown                      |
| `startDate`   | DateTime | Required                                | Event start time (UTC)                                |
| `endDate`     | DateTime | Required                                | Event end time (UTC)                                  |
| `location`    | String   | Required, Max 500 chars                 | Venue address or description                          |
| `capacity`    | Integer  | Required, > 0                           | Maximum total attendees                               |
| `imageUrl`    | URL      | Optional                                | Event cover image                                     |
| `status`      | Enum     | Required, Default='draft'               | Current state: draft, published, cancelled, completed |
| `createdAt`   | DateTime | Required, Immutable                     | Creation timestamp                                    |
| `updatedAt`   | DateTime | Required, Auto-updated                  | Last modification timestamp                           |
| `publishedAt` | DateTime | Optional                                | When event was made public                            |
| `cancelledAt` | DateTime | Optional                                | When event was cancelled                              |
| `completedAt` | DateTime | Optional                                | When event was automatically completed                |

**Derived Attributes** (computed, not stored):

- `isUpcoming`: `status == 'published' AND startDate > now()`
- `isPast`: `endDate < now()`
- `isActive`: `status == 'published' AND startDate <= now() <= endDate`
- `totalRegistrations`: Count of non-cancelled registrations
- `availableCapacity`: `capacity - totalRegistrations`

**Invariants:**

- `INV-E-001`: `endDate` must be after `startDate`
- `INV-E-002`: `startDate` must be in the future at creation time
- `INV-E-003`: `slug` must be unique across all events
- `INV-E-004`: `capacity` cannot be reduced below current `totalRegistrations`
- `INV-E-005`: `totalRegistrations` cannot exceed `capacity`
- `INV-E-006`: Once `status` is 'cancelled' or 'completed', it cannot change

**Business Rules:**

- `BR-E-001`: Only organizer can modify their own events
- `BR-E-002`: Published events with registrations have restricted editing (see DR-003)
- `BR-E-003`: Events cannot be deleted, only cancelled (soft delete for historical data)
- `BR-E-004`: System auto-completes events 24 hours after `endDate`

---

#### **Entity: TicketType**

**Purpose:** Defines a category of tickets for an event with specific pricing and quota.

**Attributes:**

| Attribute     | Type     | Constraints                              | Description                                         |
| ------------- | -------- | ---------------------------------------- | --------------------------------------------------- |
| `id`          | UUID     | Primary Key, Immutable                   | Unique identifier                                   |
| `eventId`     | UUID     | Foreign Key → Event, Required, Immutable | Parent event                                        |
| `name`        | String   | Required, 3-50 chars                     | Ticket type name (e.g., "VIP", "General Admission") |
| `description` | String   | Optional, Max 500 chars                  | Details about this ticket type                      |
| `price`       | Decimal  | Required, >= 0, Precision(10,2)          | Price per ticket (0 for free)                       |
| `quantity`    | Integer  | Required, > 0                            | Total tickets allocated to this type                |
| `available`   | Integer  | Required, >= 0                           | Remaining tickets not yet registered                |
| `createdAt`   | DateTime | Required, Immutable                      | Creation timestamp                                  |

**Derived Attributes:**

- `sold`: `quantity - available`
- `soldOut`: `available == 0`
- `soldPercentage`: `(sold / quantity) * 100`

**Invariants:**

- `INV-TT-001`: `available` must be <= `quantity`
- `INV-TT-002`: `available` must be >= 0
- `INV-TT-003`: `quantity` cannot be reduced below `sold` count
- `INV-TT-004`: Sum of all `quantity` for an event cannot exceed `event.capacity`
- `INV-TT-005`: `available` decrements atomically (prevent race conditions)

**Business Rules:**

- `BR-TT-001`: New ticket types can be added to published events
- `BR-TT-002`: Existing ticket types cannot be deleted if registrations exist
- `BR-TT-003`: Price cannot change after first registration (for MVP)
- `BR-TT-004`: When registration cancelled, `available` increments by 1

---

#### **Entity: Registration**

**Purpose:** Represents a user's confirmed attendance for an event (the "ticket").

**Attributes:**

| Attribute      | Type     | Constraints                                   | Description                                     |
| -------------- | -------- | --------------------------------------------- | ----------------------------------------------- |
| `id`           | UUID     | Primary Key, Immutable                        | Unique identifier                               |
| `eventId`      | UUID     | Foreign Key → Event, Required, Immutable      | Event being attended                            |
| `userId`       | UUID     | Foreign Key → User, Required, Immutable       | Attendee                                        |
| `ticketTypeId` | UUID     | Foreign Key → TicketType, Required, Immutable | Chosen ticket category                          |
| `ticketCode`   | UUID     | Unique, Required, Immutable                   | Human-readable ticket identifier                |
| `qrData`       | String   | Unique, Required, Immutable                   | Encrypted QR code payload                       |
| `status`       | Enum     | Required, Default='confirmed'                 | Current state: confirmed, checked_in, cancelled |
| `checkedInAt`  | DateTime | Optional                                      | When attendee was admitted                      |
| `checkedInBy`  | UUID     | Foreign Key → User, Optional                  | Staff member who performed check-in             |
| `cancelledAt`  | DateTime | Optional                                      | When registration was cancelled                 |
| `metadata`     | JSON     | Optional                                      | Additional data (special requests, etc.)        |
| `createdAt`    | DateTime | Required, Immutable                           | Registration timestamp                          |

**Derived Attributes:**

- `isValid`: `status == 'confirmed' AND event.status == 'published'`
- `canCancel`: `status == 'confirmed' AND now() < event.startDate - 1 hour`
- `canCheckIn`: `status == 'confirmed' AND event.startDate - 2h <= now() <= event.endDate + 2h`

**Invariants:**

- `INV-R-001`: `(eventId, userId, ticketTypeId)` must be unique (user can't register twice for same ticket type)
- `INV-R-002`: `ticketCode` must be globally unique
- `INV-R-003`: `qrData` must be globally unique
- `INV-R-004`: Once `status` is 'checked_in', it cannot change to 'cancelled'
- `INV-R-005`: `checkedInAt` can only be set when `status` changes to 'checked_in'
- `INV-R-006`: `checkedInBy` must reference a User with 'staff' role

**Business Rules:**

- `BR-R-001`: Registration can only be created if `ticketType.available > 0`
- `BR-R-002`: Registration creation decrements `ticketType.available` atomically
- `BR-R-003`: Cancellation increments `ticketType.available` atomically
- `BR-R-004`: QR code signature must be cryptographically valid (HMAC-SHA256)
- `BR-R-005`: Users receive email confirmation immediately after registration

---

#### **Entity: CheckIn**

**Purpose:** Records each check-in attempt for audit trail and analytics.

**Attributes:**

| Attribute        | Type     | Constraints                                     | Description                            |
| ---------------- | -------- | ----------------------------------------------- | -------------------------------------- |
| `id`             | UUID     | Primary Key, Immutable                          | Unique identifier                      |
| `registrationId` | UUID     | Foreign Key → Registration, Required, Immutable | Ticket being checked in                |
| `staffId`        | UUID     | Foreign Key → User, Required, Immutable         | Staff member performing check-in       |
| `method`         | Enum     | Required                                        | Check-in method: qr, manual            |
| `location`       | String   | Optional, Max 100 chars                         | Check-in point (e.g., "Main Entrance") |
| `deviceInfo`     | JSON     | Optional                                        | Device/browser metadata for debugging  |
| `timestamp`      | DateTime | Required, Immutable                             | Exact check-in time                    |

**Derived Attributes:**

- `eventId`: Derived from `registration.eventId` (for queries)
- `userId`: Derived from `registration.userId` (for queries)

**Invariants:**

- `INV-CI-001`: `timestamp` cannot be in the future
- `INV-CI-002`: `staffId` must reference a User with 'staff' role
- `INV-CI-003`: Multiple CheckIn records can exist for same registration (tracks duplicate scans)

**Business Rules:**

- `BR-CI-001`: First check-in for a registration updates `registration.status` to 'checked_in'
- `BR-CI-002`: Subsequent check-ins for same registration log warning but don't update status
- `BR-CI-003`: Check-in events are immutable (audit trail)
- `BR-CI-004`: If offline, check-in cached locally and synced when online

---

#### **Entity: StaffAssignment**

**Purpose:** Associates staff members with events they can check in attendees for.

**Attributes:**

| Attribute    | Type     | Constraints                              | Description                                     |
| ------------ | -------- | ---------------------------------------- | ----------------------------------------------- |
| `id`         | UUID     | Primary Key, Immutable                   | Unique identifier                               |
| `eventId`    | UUID     | Foreign Key → Event, Required, Immutable | Event being staffed                             |
| `staffId`    | UUID     | Foreign Key → User, Required, Immutable  | Staff member assigned                           |
| `assignedBy` | UUID     | Foreign Key → User, Required, Immutable  | Organizer who made assignment                   |
| `role`       | String   | Optional, Max 50 chars                   | Staff role (e.g., "Check-in Lead", "Volunteer") |
| `createdAt`  | DateTime | Required, Immutable                      | Assignment timestamp                            |

**Invariants:**

- `INV-SA-001`: `(eventId, staffId)` must be unique (staff can't be assigned twice to same event)
- `INV-SA-002`: `staffId` must reference a User with 'staff' role
- `INV-SA-003`: `assignedBy` must be the event's organizer

**Business Rules:**

- `BR-SA-001`: Only event organizer can assign staff
- `BR-SA-002`: Staff can be assigned to multiple events
- `BR-SA-003`: Staff assignment can be revoked before event starts

---

#### **Entity: EventReminder**

**Purpose:** Tracks which reminder emails have been sent to prevent duplicates.

**Attributes:**

| Attribute        | Type     | Constraints                              | Description                   |
| ---------------- | -------- | ---------------------------------------- | ----------------------------- |
| `id`             | UUID     | Primary Key, Immutable                   | Unique identifier             |
| `eventId`        | UUID     | Foreign Key → Event, Required, Immutable | Event for which reminder sent |
| `reminderType`   | Enum     | Required                                 | Type: 24h, 2h                 |
| `recipientCount` | Integer  | Required, >= 0                           | Number of attendees notified  |
| `sentAt`         | DateTime | Required, Immutable                      | When batch was queued         |
| `completedAt`    | DateTime | Optional                                 | When all emails delivered     |
| `failedCount`    | Integer  | Required, Default=0                      | Number of failed deliveries   |

**Invariants:**

- `INV-ER-001`: `(eventId, reminderType)` must be unique (only one 24h reminder per event)
- `INV-ER-002`: `recipientCount` must equal count of eligible registrations at send time

**Business Rules:**

- `BR-ER-001`: Reminder only sent if event status is 'published'
- `BR-ER-002`: System checks for existing reminder before sending (idempotency)
- `BR-ER-003`: Failed emails retry up to 3 times over 6 hours

---

### 4.9.2 Entity Relationships

**Relationship Diagram (Conceptual):**

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │
       │ organizes (1:N)
       │
       ├────────────────────────┐
       │                        │
       │                        ▼
       │                ┌───────────────┐
       │                │     Event     │
       │                └───────┬───────┘
       │                        │
       │                        │ has (1:N)
       │                        │
       │                        ▼
       │                ┌──────────────────┐
       │                │   TicketType     │
       │                └──────────────────┘
       │                        │
       │                        │ allocated to (1:N)
       │                        │
       │ registers for (N:M)    ▼
       │                ┌──────────────────┐
       └───────────────▶│  Registration    │◀─────────┐
                        └──────────────────┘          │
                                │                     │
                                │                     │
                        ┌───────┴──────┐              │
                        │              │              │
                        │ checked in   │ performed by │
                        │ via (1:N)    │ (N:1)        │
                        │              │              │
                        ▼              ▼              │
                ┌───────────┐  ┌──────────────────┐  │
                │  CheckIn  │  │ StaffAssignment  │──┘
                └───────────┘  └──────────────────┘
                                        │
                                        │ assigned to (N:1)
                                        │
                                        ▼
                                ┌───────────────┐
                                │     Event     │
                                └───────────────┘
```

**Detailed Relationships:**

#### R-001: User **organizes** Event (1:N)

- **Cardinality:** One User (Organizer) can create many Events
- **Nature:** Ownership relationship
- **Cascade:** If User deleted → Transfer or cancel Events
- **Constraint:** `event.organizerId` must reference active User with 'organizer' role

#### R-002: Event **has** TicketType (1:N)

- **Cardinality:** One Event has one or more TicketTypes
- **Nature:** Composition (TicketType cannot exist without Event)
- **Cascade:** If Event deleted → Delete all TicketTypes
- **Constraint:** Sum of `ticketType.quantity` ≤ `event.capacity`

#### R-003: User **registers for** Event **via** Registration (N:M)

- **Cardinality:** Many Users can register for many Events (through Registration)
- **Nature:** Association with attributes (Registration is the associative entity)
- **Cascade:** If User deleted → Cancel Registrations; If Event deleted → Cancel Registrations
- **Constraint:** `(userId, eventId, ticketTypeId)` is unique

#### R-004: TicketType **allocated to** Registration (1:N)

- **Cardinality:** One TicketType can be allocated to many Registrations
- **Nature:** Classification
- **Cascade:** If TicketType deleted → Prevent if Registrations exist
- **Constraint:** Count of Registrations ≤ `ticketType.quantity`

#### R-005: Registration **checked in via** CheckIn (1:N)

- **Cardinality:** One Registration can have multiple CheckIn records (audit trail)
- **Nature:** Audit/history relationship
- **Cascade:** If Registration deleted → Retain CheckIn records (soft delete)
- **Constraint:** First CheckIn updates `registration.status`

#### R-006: User (Staff) **performs** CheckIn (1:N)

- **Cardinality:** One Staff member performs many CheckIns
- **Nature:** Accountability
- **Cascade:** If User deleted → Retain CheckIn records (historical integrity)
- **Constraint:** User must have 'staff' role

#### R-007: User (Organizer) **assigns** Staff to Event **via** StaffAssignment (N:M)

- **Cardinality:** Many Staff can be assigned to many Events
- **Nature:** Authorization relationship
- **Cascade:** If Event deleted → Delete StaffAssignments
- **Constraint:** Only event's organizer can create assignments

#### R-008: Event **tracked by** EventReminder (1:N)

- **Cardinality:** One Event has multiple EventReminder records (24h, 2h)
- **Nature:** Audit relationship
- **Cascade:** If Event deleted → Retain EventReminder records
- **Constraint:** Max 2 reminders per event (one per type)

---

### 4.9.3 State Machines

#### State Machine: Event

**States:**

- `draft` - Initial state
- `published` - Public and accepting registrations
- `cancelled` - Terminated before completion
- `completed` - Ended naturally

**State Diagram:**

```
                  ┌─────────┐
            ┌────▶│  draft  │◀──── [Initial State]
            │     └────┬────┘
            │          │
            │          │ CMD-003: PublishEvent
            │          │ (organizer action)
            │          ▼
            │     ┌───────────┐
            │     │ published │
            │     └─────┬─────┘
            │           │
            │           ├────────────────────┐
            │           │                    │
            │           │ CMD-009:           │ SYS-004: Auto-complete
            │           │ CancelEvent        │ (endDate + 24h passed)
            │           │ (organizer)        │ (system cron)
            │           ▼                    ▼
            │     ┌───────────┐        ┌───────────┐
            │     │ cancelled │        │ completed │
            │     └───────────┘        └───────────┘
            │           ▲                    ▲
            │           │                    │
            │           │ CMD-009:           │
            │           │ CancelEvent        │
            │           │                    │
            └───────────┴────────────────────┘
                  (if in draft state)

[Terminal States: cancelled, completed]
```

**Transitions:**

| From        | To          | Trigger                | Conditions                                                                           | Side Effects                                                                                                |
| ----------- | ----------- | ---------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `draft`     | `published` | CMD-003: PublishEvent  | - All required fields populated<br>- At least 1 ticket type<br>- startDate in future | - Set `publishedAt`<br>- Index for search<br>- Emit `EventPublished`                                        |
| `draft`     | `cancelled` | CMD-009: CancelEvent   | - Organizer owns event                                                               | - Set `cancelledAt`<br>- Emit `EventCancelled`                                                              |
| `published` | `cancelled` | CMD-009: CancelEvent   | - startDate in future<br>- Event hasn't started                                      | - Set `cancelledAt`<br>- Cancel all registrations<br>- Queue cancellation emails<br>- Emit `EventCancelled` |
| `published` | `completed` | SYS-004: Auto-complete | - `endDate + 24h < now()`                                                            | - Set `completedAt`<br>- Calculate final stats<br>- Emit `EventAutoCompleted`                               |

**Invariants:**

- `SI-E-001`: Cannot transition from terminal states (`cancelled`, `completed`)
- `SI-E-002`: `published` → `cancelled` only if `startDate > now()` (can't cancel started event)
- `SI-E-003`: Only transitions shown are allowed (no `completed` → `published`, etc.)

**Guarded Transitions:**

```
draft → published:
  GUARD: hasRequiredFields() AND hasTicketTypes() AND isFuture(startDate)

published → cancelled:
  GUARD: !hasStarted() AND isOrganizer(user)

published → completed:
  GUARD: now() > (endDate + 24 hours)
```

---

#### State Machine: Registration (Ticket)

**States:**

- `confirmed` - Valid, not yet used
- `checked_in` - Attendee admitted
- `cancelled` - Voided by user or system

**State Diagram:**

```
                    ┌───────────┐
              ┌────▶│ confirmed │◀──── [Initial State]
              │     └─────┬─────┘
              │           │
              │           ├─────────────────┐
              │           │                 │
              │           │ CMD-006:        │ CMD-010:
              │           │ CheckInTicket   │ CancelRegistration
              │           │ (staff)         │ (attendee)
              │           │                 │
              │           │                 │ OR
              │           │                 │ CMD-009: CancelEvent
              │           │                 │ (cascade from event)
              │           │                 │
              │           ▼                 ▼
              │     ┌─────────────┐   ┌───────────┐
              │     │ checked_in  │   │ cancelled │
              │     └─────────────┘   └───────────┘
              │           ▲                 ▲
              │           │                 │
              └───────────┴─────────────────┘
                    [Terminal States]
```

**Transitions:**

| From        | To           | Trigger                        | Conditions                                                                             | Side Effects                                                                                                              |
| ----------- | ------------ | ------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `confirmed` | `checked_in` | CMD-006: CheckInTicket         | - Valid QR signature<br>- Correct event<br>- Within event window<br>- Staff authorized | - Set `checkedInAt`<br>- Set `checkedInBy`<br>- Create CheckIn record<br>- Emit `AttendeeCheckedIn`                       |
| `confirmed` | `cancelled`  | CMD-010: CancelRegistration    | - User owns registration<br>- `now() < startDate - 1h`<br>- Not checked in             | - Set `cancelledAt`<br>- Increment `ticketType.available`<br>- Invalidate QR code<br>- Emit `RegistrationCancelled`       |
| `confirmed` | `cancelled`  | CMD-009: CancelEvent (cascade) | - Event cancelled by organizer                                                         | - Set `cancelledAt`<br>- Increment `ticketType.available`<br>- Queue cancellation email<br>- Emit `RegistrationCancelled` |

**Invariants:**

- `SI-R-001`: Cannot transition from terminal states (`checked_in`, `cancelled`)
- `SI-R-002`: Cannot transition `checked_in` → `cancelled` (once admitted, cannot cancel)
- `SI-R-003`: Only transitions shown are allowed

**Guarded Transitions:**

```
confirmed → checked_in:
  GUARD: validateQRSignature(qrData) AND
         matchesEvent(eventId) AND
         withinTimeWindow(now(), event.startDate, event.endDate) AND
         isAssignedStaff(staffId, eventId)

confirmed → cancelled (by user):
  GUARD: ownsRegistration(userId, registrationId) AND
         now() < (event.startDate - 1 hour) AND
         status == 'confirmed'

confirmed → cancelled (by system):
  GUARD: event.status == 'cancelled'
```

**Special Cases:**

**Duplicate Check-In Handling:**

- If `status == 'checked_in'` and CheckInTicket called again:
  - Do NOT change state
  - Create CheckIn record (for audit)
  - Return warning: "Already checked in at {timestamp}"
  - Allow entry (benefit of doubt - could be rescanning)

---

### 4.9.4 Domain Constraints and Invariants

#### Global Invariants

**Capacity Management:**

```
INV-CAPACITY-001: Event Capacity
  For any Event E:
    count(Registration WHERE eventId = E.id AND status != 'cancelled') ≤ E.capacity

INV-CAPACITY-002: Ticket Type Allocation
  For any Event E:
    sum(TicketType.quantity WHERE eventId = E.id) ≤ E.capacity

INV-CAPACITY-003: Available Tickets
  For any TicketType T:
    T.available = T.quantity - count(Registration WHERE ticketTypeId = T.id AND status != 'cancelled')
```

**Temporal Constraints:**

```
INV-TIME-001: Event Dates
  For any Event E:
    E.endDate > E.startDate

INV-TIME-002: Future Events at Creation
  For any new Event E:
    E.startDate > now()

INV-TIME-003: Registration Timeline
  For any Registration R with Event E:
    R.createdAt ≤ E.startDate
    (Cannot register after event has started)

INV-TIME-004: Cancellation Deadline
  For any Registration R with Event E:
    IF R.status == 'confirmed' AND user cancels
    THEN now() < (E.startDate - 1 hour)

INV-TIME-005: Check-In Window
  For any CheckIn C with Registration R and Event E:
    (E.startDate - 2 hours) ≤ C.timestamp ≤ (E.endDate + 2 hours)
```

**Uniqueness Constraints:**

```
INV-UNIQUE-001: Event Slug
  For any two Events E1, E2:
    IF E1.id != E2.id THEN E1.slug != E2.slug

INV-UNIQUE-002: Ticket Code
  For any two Registrations R1, R2:
    IF R1.id != R2.id THEN R1.ticketCode != R2.ticketCode

INV-UNIQUE-003: QR Data
  For any two Registrations R1, R2:
    IF R1.id != R2.id THEN R1.qrData != R2.qrData

INV-UNIQUE-004: User Registration
  For any Event E, User U, TicketType T:
    count(Registration WHERE eventId = E.id AND userId = U.id AND ticketTypeId = T.id AND status != 'cancelled') ≤ 1
```

**Referential Integrity:**

```
INV-REF-001: Organizer Must Exist
  For any Event E:
    exists(User WHERE id = E.organizerId AND role IN ('organizer', 'admin'))

INV-REF-002: Ticket Type Belongs to Event
  For any Registration R:
    R.ticketTypeId.eventId = R.eventId

INV-REF-003: Staff Authorization
  For any CheckIn C:
    exists(StaffAssignment WHERE eventId = C.eventId AND staffId = C.staffId)
    OR exists(User WHERE id = C.staffId AND role = 'admin')

INV-REF-004: Check-In References Valid Registration
  For any CheckIn C:
    exists(Registration WHERE id = C.registrationId)
```

#### State-Dependent Constraints

**Event State Constraints:**

```
CONST-ES-001: Draft Event Editing
  IF Event.status == 'draft' THEN
    All fields are editable by organizer

CONST-ES-002: Published Event Editing
  IF Event.status == 'published' AND hasRegistrations() THEN
    - Cannot edit: startDate (within 48h), endDate, capacity (if would reduce below registrations)
    - Can edit: title, description, location (triggers notification)
    - Can add: ticket types
    - Cannot delete: existing ticket types

CONST-ES-003: Terminal State Immutability
  IF Event.status IN ('cancelled', 'completed') THEN
    Event is read-only (no edits allowed)

CONST-ES-004: Published Visibility
  IF Event.status == 'published' THEN
    Event visible in public listings
  ELSE
    Event visible only to organizer
```

**Registration State Constraints:**

```
CONST-RS-001: Confirmed Ticket Validity
  IF Registration.status == 'confirmed' AND Event.status == 'published' THEN
    QR code is valid and scannable

CONST-RS-002: Checked-In Immutability
  IF Registration.status == 'checked_in' THEN
    - Cannot transition to 'cancelled'
    - checkedInAt is immutable
    - checkedInBy is immutable

CONST-RS-003: Cancelled Ticket Invalidity
  IF Registration.status == 'cancelled' THEN
    - QR code is invalid (fails signature check in application logic)
    - Cannot check in
    - Ticket quota returned to ticket type
```

#### Atomicity Constraints

**Transaction Boundaries:**

```
ATOMIC-001: Registration Creation
  The following MUST occur atomically:
    1. Create Registration record
    2. Decrement TicketType.available
    3. Verify capacity not exceeded
  IF any step fails THEN all rollback

ATOMIC-002: Check-In Process
  The following MUST occur atomically:
    1. Validate registration status = 'confirmed'
    2. Update registration status = 'checked_in'
    3. Set checkedInAt, checkedInBy
    4. Create CheckIn record
  IF any step fails THEN all rollback

ATOMIC-003: Event Cancellation
  The following MUST occur atomically:
    1. Update Event.status = 'cancelled'
    2. Update all Registration.status = 'cancelled'
    3. Restore ticket quotas (TicketType.available)
    4. Queue cancellation notifications
  IF any step fails THEN all rollback

ATOMIC-004: Registration Cancellation
  The following MUST occur atomically:
    1. Update Registration.status = 'cancelled'
    2. Increment TicketType.available
  IF any step fails THEN all rollback
```

#### Security Constraints

**Cryptographic Invariants:**

```
CRYPTO-001: QR Code Integrity
  For any Registration R:
    R.qrData = f(R.eventId, R.id, timestamp, HMAC-SHA256(R.eventId:R.id:timestamp, SECRET_KEY))
  WHERE SECRET_KEY is system-wide secret, never exposed to clients

CRYPTO-002: Signature Validation
  For any CheckIn operation:
    QR signature MUST be verified using constant-time comparison
    (Prevents timing attacks)

CRYPTO-003: Timestamp Freshness
  QR codes generated with timestamp T are considered valid only if:
    (Event.startDate - 24h) ≤ T ≤ (Event.endDate + 2h)
```

**Authorization Constraints:**

```
AUTHZ-001: Event Ownership
  For any Event modification command:
    Command.userId == Event.organizerId OR User.role == 'admin'

AUTHZ-002: Registration Ownership
  For any Registration cancellation:
    Command.userId == Registration.userId OR Event.organizerId == Command.userId

AUTHZ-003: Check-In Authorization
  For any CheckIn operation:
    User.role == 'staff' AND exists(StaffAssignment WHERE staffId = User.id AND eventId = Event.id)
    OR User.role == 'admin'

AUTHZ-004: Data Visibility
  - Users can view only their own registrations
  - Organizers can view registrations for their events
  - Staff can view registrations for assigned events
  - Admins can view all data
```

#### Data Quality Constraints

**Validation Rules:**

```
VALID-001: Email Format
  User.email MUST match RFC 5322 email pattern
  AND domain has valid MX record (checked on registration)

VALID-002: Date Ordering
  For any Event E:
    E.createdAt ≤ E.publishedAt ≤ E.startDate ≤ E.endDate ≤ E.completedAt

VALID-003: Numeric Ranges
  - Event.capacity: 1 to 1,000,000
  - TicketType.quantity: 1 to Event.capacity
  - TicketType.price: 0.00 to 99,999.99
  - Title length: 5 to 200 characters
  - Description length: 0 to 5000 characters

VALID-004: Slug Format
  Event.slug MUST:
    - Be lowercase
    - Contain only [a-z0-9-]
    - Not start or end with hyphen
    - Be 3-100 characters
```

#### Cascading Rules

**Deletion Cascades:**

```
CASCADE-001: User Deletion
  IF User deleted THEN:
    - Cancel all Registrations where userId = User.id
    - Transfer or cancel all Events where organizerId = User.id
    - Remove all StaffAssignments where staffId = User.id
    - Retain CheckIn records (historical integrity, anonymize staffId)

CASCADE-002: Event Deletion
  Events cannot be deleted, only cancelled
  IF Event cancelled THEN:
    - Cancel all Registrations (status = 'cancelled')
    - Delete all StaffAssignments
    - Retain all CheckIn records (audit trail)
    - Retain all EventReminder records

CASCADE-003: TicketType Deletion
  IF TicketType has Registrations THEN:
    Deletion is BLOCKED
  ELSE:
    Allow deletion

CASCADE-004: Registration Deletion
  Registrations cannot be hard-deleted
  Use soft delete (status = 'cancelled')
```

---

**Conceptual Model Status:** COMPLETE  
**Entities Defined:** 7 core entities  
**Relationships Defined:** 8 relationship types  
**State Machines:** 2 (Event, Registration)  
**Invariants Documented:** 40+ constraints

**Next Step:** Map conceptual model to physical database schema (SQL DDL)

---

## 5. Key Assumptions

### 5.1 Technical Assumptions

**ASM-T-001: Single Currency**

- All pricing in single currency (e.g., USD)
- No multi-currency support in MVP
- Currency symbol configurable via environment variable

**ASM-T-002: Email Delivery**

- External email service (Resend/SendGrid) is reliable
- 99%+ delivery rate for transactional emails
- Emails delivered within 60 seconds of trigger

**ASM-T-003: QR Code Scanning**

- Staff use modern mobile devices with cameras
- Adequate lighting at check-in locations
- Camera permissions granted by browser/OS

**ASM-T-004: Network Connectivity**

- Check-in locations have stable internet (LTE or WiFi)
- Fallback: System caches recent registrations for offline validation
- Offline check-ins sync when connection restored

**ASM-T-005: Authentication Provider**

- Supabase Auth is primary authentication mechanism
- Users have valid email addresses
- Email verification required before first registration

### 4.2 Business Assumptions

**ASM-B-001: Event Timezone**

- All events operate in a single timezone (system default)
- Event start/end times stored in UTC, displayed in local timezone
- No cross-timezone event support in MVP

**ASM-B-002: Free Events Priority**

- MVP focuses on free events (price = 0)
- Paid ticketing (payment gateway integration) is post-MVP
- Price field exists in schema but payment flow not implemented

**ASM-B-003: Single-Day Events**

- Events occur on a single day (start and end on same date)
- Multi-day conferences/festivals are post-MVP feature

**ASM-B-004: English Language**

- UI, emails, and content in English only
- Internationalization (i18n) is future enhancement

**ASM-B-005: Organizer Trust**

- Users requesting Organizer role are manually approved (admin process)
- No automated vetting or background checks
- Platform assumes good faith actors

**ASM-B-006: Staff Assignment**

- Organizers manually assign staff to events
- No automated scheduling or shift management
- Staff can be assigned to multiple events

### 4.3 User Assumptions

**ASM-U-001: Device Ownership**

- Attendees have smartphones to receive and display QR tickets
- Fallback: PDF tickets printable for desktop users

**ASM-U-002: Email Access**

- All users have valid, accessible email accounts
- Users check email regularly for event communications

**ASM-U-003: Digital Literacy**

- Users can navigate web forms, upload images, use camera for QR scanning
- Minimal technical support required

---

## 5. Explicit Non-Goals

### 5.1 Features Explicitly Excluded from MVP

**NG-001: Payment Processing**

- No integration with Stripe, PayPal, or payment gateways
- All events are FREE in MVP
- Paid ticketing deferred to Phase 2

**NG-002: Refunds**

- No refund mechanism (since all events free in MVP)
- Cancellation simply releases ticket quota

**NG-003: Waitlists**

- When event reaches capacity, registration closes
- No queue or waitlist management
- Users cannot "get in line"

**NG-004: Social Features**

- No event sharing to Facebook/Twitter
- No "invite friends" functionality
- No attendee social profiles or networking

**NG-005: Mobile Native Apps**

- Web-only (responsive PWA acceptable)
- No iOS or Android native applications
- Mobile web browsers must suffice

**NG-006: Advanced Analytics**

- No funnel analysis, cohort tracking, or BI dashboards
- Basic statistics only (registration count, check-in rate)
- Third-party analytics integration (Google Analytics) out of scope

**NG-007: Event Recommendations**

- No AI-powered event suggestions
- No "events you may like" based on history
- Users manually browse and search

**NG-008: Calendar Integration**

- No automatic export to Google Calendar, iCal, Outlook
- Users manually add events to personal calendars

**NG-009: Multi-Organizer Events**

- Each event has single organizer (owner)
- No co-hosting or collaborative event management
- Organizer cannot transfer ownership

**NG-010: Custom Branding**

- Events use standard platform styling
- No custom CSS, logos, or white-labeling
- Event image is only visual customization

**NG-011: Multi-Language Support**

- English-only interface
- No translations or locale switching

**NG-012: Advanced Access Control**

- No granular permissions (e.g., "staff can edit but not delete")
- Roles are fixed with predefined capabilities
- No custom role creation

**NG-013: Recurring Events**

- Each event is a one-time occurrence
- No series, recurrence patterns, or event templates

**NG-014: Live Streaming Integration**

- Physical events only
- No virtual/hybrid event support
- No Zoom, YouTube, or streaming platform integration

**NG-015: On-Site Badge Printing**

- QR tickets are digital or pre-printed only
- No thermal printer integration for on-demand badges

### 5.2 Architectural Non-Goals

**NG-A-001: Multi-Tenancy**

- Single shared database for all users
- No isolated tenant environments or data segregation
- Row-Level Security (RLS) provides data isolation

**NG-A-002: Microservices**

- Monolithic Next.js application
- No separate backend services or API gateways
- Supabase Edge Functions for specific async tasks only

**NG-A-003: Real-Time Collaboration**

- No live co-editing of event details
- No presence indicators ("User X is viewing this event")

**NG-A-004: Offline-First Architecture**

- Online connectivity required for most operations
- Limited offline support (check-in caching only)

### 5.3 Quality Attribute Non-Goals

**NG-Q-001: 99.99% Uptime**

- Target is 99.5% availability
- Scheduled maintenance windows acceptable

**NG-Q-002: Sub-100ms Response Times**

- Target is reasonable performance (< 2s page loads)
- Not optimizing for extreme low latency

**NG-Q-003: Million-User Scale**

- Designed for 10,000-100,000 users initially
- Horizontal scaling not priority in MVP

---

## 6. System Constraints

### 6.1 Technical Constraints

**CON-T-001: Technology Stack**

- Must use Next.js 14+ (App Router)
- Must use Supabase (no alternative backends)
- Must use TypeScript (no JavaScript)

**CON-T-002: Browser Support**

- Modern browsers only (Chrome, Firefox, Safari, Edge - last 2 versions)
- No IE11 or legacy browser support

**CON-T-003: Mobile Responsiveness**

- All interfaces must work on mobile screens (320px width minimum)
- Touch-friendly UI elements (44px minimum tap targets)

### 6.2 Business Constraints

**CON-B-001: Data Privacy**

- GDPR compliance required (user data deletion, export)
- Privacy policy and terms of service must be displayed
- User consent for email communications

**CON-B-002: Budget**

- Use free tiers of services where possible
- Supabase free tier: 500MB database, 1GB file storage
- Vercel free tier: Unlimited deployments, 100GB bandwidth

### 6.3 Regulatory Constraints

**CON-R-001: Accessibility**

- WCAG 2.1 Level AA compliance target
- Keyboard navigation support
- Screen reader compatible

---

## 7. Success Criteria

The system specification is considered complete and approved when:

✅ **Clarity:** All stakeholders understand user roles, workflows, and domain concepts  
✅ **Completeness:** Core features, assumptions, and non-goals explicitly documented  
✅ **Consensus:** Product owner, developers, and designers agree on scope  
✅ **Traceability:** Each requirement has clear rationale and acceptance criteria

The implementation is considered successful when:

✅ **Functional:** All specified workflows operate correctly  
✅ **Secure:** QR codes cannot be forged, user data protected  
✅ **Performant:** Check-in completes in < 3 seconds per attendee  
✅ **Usable:** Non-technical users can create events and register without training

---

## 8. Model Context Protocol (MCP) Integration Strategy

This section defines how the Model Context Protocol (MCP) should be configured to provide LLM agents with structured access to project context, ensuring specification-driven development and reducing hallucination.

### 8.1 MCP Overview for This Project

**Purpose:** Expose the Event Management system's specification, domain model, commands, and project structure as machine-readable context that LLM coding assistants can query and validate against.

**MCP Server Role:** Acts as a "source of truth" server that LLMs query to:

- Retrieve domain definitions before generating code
- Validate proposed implementations against specifications
- Discover existing entities, commands, and flows
- Understand project structure and conventions

**Key Benefit:** Forces LLM to **read the spec first** before writing code, dramatically reducing hallucination and off-spec implementations.

---

### 8.2 Context to Expose via MCP

The MCP server should expose the following structured context:

#### 8.2.1 Specification Documents

**Resources to Expose:**

1. **`spec://specification`** - This SPECIFICATION.md file (entire document)
   - **Format:** Markdown
   - **MCP Resource Type:** `text/markdown`
   - **Usage:** LLM reads before any code generation
   - **Sections Queryable:**
     - System overview
     - User roles and permissions
     - Domain concepts and vocabulary
     - User flows (all 16 flows)
     - Commands (all 10 commands)
     - Conceptual data model
     - Constraints and invariants

2. **`spec://entities`** - Extracted entity definitions
   - **Format:** Structured JSON
   - **Schema:**
     ```json
     {
       "entities": [
         {
           "name": "Event",
           "purpose": "...",
           "attributes": [...],
           "invariants": [...],
           "businessRules": [...]
         }
       ]
     }
     ```
   - **Usage:** LLM validates entity usage in code

3. **`spec://commands`** - Command catalog
   - **Format:** Structured JSON
   - **Schema:**
     ```json
     {
       "commands": [
         {
           "id": "CMD-001",
           "name": "CreateEvent",
           "intent": "...",
           "actor": "Organizer",
           "inputs": {...},
           "preconditions": [...],
           "outputs": {...},
           "errorCases": [...]
         }
       ]
     }
     ```
   - **Usage:** LLM implements commands correctly

4. **`spec://flows`** - User flow definitions
   - **Format:** Structured JSON
   - **Schema:**
     ```json
     {
       "flows": [
         {
           "id": "O-001",
           "name": "Create and Publish Event",
           "actor": "Organizer",
           "steps": [...],
           "errorScenarios": [...]
         }
       ]
     }
     ```
   - **Usage:** LLM creates UI flows and API endpoints

5. **`spec://state-machines`** - State transition rules
   - **Format:** Structured JSON
   - **Schema:**
     ```json
     {
       "stateMachines": {
         "Event": {
           "states": ["draft", "published", "cancelled", "completed"],
           "transitions": [
             {
               "from": "draft",
               "to": "published",
               "trigger": "CMD-003: PublishEvent",
               "guards": [...],
               "sideEffects": [...]
             }
           ]
         }
       }
     }
     ```
   - **Usage:** LLM validates state transitions in code

6. **`spec://invariants`** - System constraints
   - **Format:** Structured JSON
   - **Schema:**
     ```json
     {
       "invariants": [
         {
           "id": "INV-CAPACITY-001",
           "category": "Capacity Management",
           "rule": "count(Registration WHERE ...) <= E.capacity",
           "enforcement": "database constraint + application validation"
         }
       ]
     }
     ```
   - **Usage:** LLM adds validation logic

#### 8.2.2 Project Structure

**Resources to Expose:**

7. **`project://structure`** - Folder and file organization
   - **Format:** Directory tree JSON
   - **Schema:**
     ```json
     {
       "root": "/EventManagement",
       "structure": {
         "src/": {
           "app/": "Next.js App Router pages",
           "components/": "React components",
           "lib/": {
             "commands/": "Business command implementations",
             "domain/": "Domain entities and value objects",
             "services/": "External service integrations"
           },
           "types/": "TypeScript type definitions"
         },
         "supabase/": {
           "migrations/": "Database migrations",
           "functions/": "Edge functions"
         },
         "docs/": "Additional documentation"
       }
     }
     ```
   - **Usage:** LLM creates files in correct locations

8. **`project://conventions`** - Coding standards
   - **Format:** Markdown or JSON
   - **Content:**
     - Naming conventions (e.g., `use-kebab-case` for files)
     - File organization patterns
     - Import order rules
     - Component structure templates
     - Error handling patterns
   - **Usage:** LLM follows project style

9. **`project://tech-stack`** - Technology choices
   - **Format:** JSON
   - **Schema:**
     ```json
     {
       "frontend": {
         "framework": "Next.js 14+",
         "language": "TypeScript 5+",
         "ui": "shadcn/ui (Radix UI + Tailwind)",
         "forms": "React Hook Form + Zod",
         "qr": "@zxing/browser, qrcode.react"
       },
       "backend": {
         "database": "Supabase PostgreSQL",
         "auth": "Supabase Auth",
         "storage": "Supabase Storage",
         "realtime": "Supabase Realtime"
       },
       "deployment": {
         "hosting": "Vercel",
         "database": "Supabase Cloud"
       }
     }
     ```
   - **Usage:** LLM uses correct libraries

#### 8.2.3 Implementation Context

**Resources to Expose:**

10. **`impl://database-schema`** - Current database state
    - **Format:** PostgreSQL schema dump or JSON representation
    - **Content:** Tables, columns, indexes, constraints, RLS policies
    - **Usage:** LLM writes queries against actual schema

11. **`impl://api-routes`** - Existing API endpoints
    - **Format:** OpenAPI/Swagger JSON
    - **Schema:**
      ```json
      {
        "endpoints": [
          {
            "path": "/api/events",
            "method": "GET",
            "command": null,
            "response": {...}
          },
          {
            "path": "/api/events/:id/register",
            "method": "POST",
            "command": "CMD-004: RegisterForEvent",
            "request": {...},
            "response": {...}
          }
        ]
      }
      ```
    - **Usage:** LLM creates consistent API patterns

12. **`impl://components`** - React component inventory
    - **Format:** Component catalog JSON
    - **Schema:**
      ```json
      {
        "components": [
          {
            "name": "EventCard",
            "path": "src/components/events/EventCard.tsx",
            "props": {...},
            "usage": "Display event in listing grid"
          }
        ]
      }
      ```
    - **Usage:** LLM reuses existing components

13. **`impl://types`** - TypeScript type definitions
    - **Format:** Auto-generated from code
    - **Content:** All exported types, interfaces, enums
    - **Usage:** LLM uses correct types

#### 8.2.4 Domain Knowledge

**Resources to Expose:**

14. **`domain://glossary`** - Business terminology
    - **Format:** JSON dictionary
    - **Schema:**
      ```json
      {
        "terms": [
          {
            "term": "QR Ticket",
            "definition": "A cryptographically signed data structure...",
            "format": "{eventId}:{registrationId}:{timestamp}:{signature}",
            "relatedEntities": ["Registration"]
          }
        ]
      }
      ```
    - **Usage:** LLM uses correct domain language

15. **`domain://bounded-contexts`** - Context boundaries
    - **Format:** JSON
    - **Schema:**
      ```json
      {
        "contexts": [
          {
            "name": "Event Management",
            "entities": ["Event", "TicketType"],
            "responsibilities": [...],
            "events": ["EventCreated", "EventPublished"],
            "antiCorruptionLayer": "No direct queries to Ticketing tables"
          }
        ]
      }
      ```
    - **Usage:** LLM respects domain boundaries

---

### 8.3 How MCP Prevents Hallucination

MCP enforces specification-driven development through several mechanisms:

#### 8.3.1 Pre-Generation Validation

**Before generating any code, the LLM must:**

1. **Query the Specification**
   - LLM: "What are the requirements for creating an event?"
   - MCP: Returns CMD-001 (CreateEvent) with inputs, preconditions, error cases
   - **Result:** LLM knows exact requirements, not guessing

2. **Check Entity Definitions**
   - LLM: "What attributes does the Event entity have?"
   - MCP: Returns complete attribute list with types and constraints
   - **Result:** LLM doesn't invent fields (e.g., won't add `eventType` if not in spec)

3. **Validate Domain Concepts**
   - LLM: "What are the possible event statuses?"
   - MCP: Returns exact enum values: `draft, published, cancelled, completed`
   - **Result:** LLM won't use `pending` or `active` (hallucination)

4. **Retrieve Business Rules**
   - LLM: "Can I reduce event capacity after registration?"
   - MCP: Returns INV-E-004 constraint
   - **Result:** LLM implements validation correctly

#### 8.3.2 Real-Time Context Grounding

**During code generation:**

1. **Component Reuse Check**
   - LLM: "Does a component for displaying QR codes exist?"
   - MCP: Returns `impl://components` catalog
   - **Result:** LLM reuses existing `QRCodeDisplay` instead of creating duplicate

2. **API Pattern Consistency**
   - LLM: "What's the response format for API endpoints?"
   - MCP: Returns standard format from `spec://commands`
   - **Result:** All endpoints use consistent `{success, data, error}` structure

3. **Type Safety**
   - LLM: "What's the type signature for the registration function?"
   - MCP: Returns TypeScript types from `impl://types`
   - **Result:** Correct function signatures, no type errors

#### 8.3.3 Constraint Enforcement

**MCP provides constraints that LLM validates against:**

1. **Invariant Checking**
   - LLM generates code that might violate capacity
   - MCP: "Check INV-CAPACITY-001"
   - LLM: Adds validation `if (totalRegistrations >= capacity) throw Error`
   - **Result:** Business rules enforced in code

2. **State Transition Validation**
   - LLM generates code to transition event from `completed` to `published`
   - MCP: Returns state machine showing this is illegal
   - LLM: Rejects invalid transition
   - **Result:** State machine respected

3. **Authorization Verification**
   - LLM generates endpoint to delete event
   - MCP: Returns AUTHZ-001 constraint
   - LLM: Adds ownership check
   - **Result:** Security enforced

#### 8.3.4 Hallucination Detection Examples

**Common hallucinations MCP prevents:**

| Hallucination                     | Without MCP                              | With MCP                                                                                |
| --------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| **Inventing fields**              | LLM adds `event.category`                | MCP shows Event entity has no `category` → LLM doesn't add it                           |
| **Wrong states**                  | LLM uses `event.status = 'pending'`      | MCP returns valid states (draft/published/cancelled/completed) → LLM uses correct value |
| **Skipping validation**           | LLM creates event without capacity check | MCP shows INV-CAPACITY-001 → LLM adds check                                             |
| **Inconsistent naming**           | LLM names function `makeEvent()`         | MCP shows convention is `CreateEvent` → LLM uses correct name                           |
| **Ignoring constraints**          | LLM allows cancellation after check-in   | MCP shows state machine forbids this → LLM blocks it                                    |
| **Creating duplicate components** | LLM creates new `EventList` component    | MCP shows `EventCard` already exists → LLM reuses it                                    |

---

### 8.4 Development Steps That Benefit Most from MCP

#### **Phase 1: High-Benefit Activities**

**1. Domain Entity Implementation (90% benefit)**

- **Task:** Creating TypeScript types/classes for entities
- **MCP Usage:**
  - Query `spec://entities` for complete attribute list
  - Get constraints from `spec://invariants`
  - Retrieve business rules
- **Benefit:** Zero field hallucination, all constraints included
- **Example Query:** `"Give me the complete Event entity definition with all attributes, types, and constraints"`

**2. Command/Service Layer (95% benefit)**

- **Task:** Implementing business commands (CreateEvent, RegisterForEvent, etc.)
- **MCP Usage:**
  - Query `spec://commands` for exact implementation spec
  - Get preconditions, steps, error cases
  - Check transaction boundaries from invariants
- **Benefit:** Perfect alignment with spec, all error cases handled
- **Example Query:** `"Show me the complete specification for CMD-004: RegisterForEvent including all error cases"`

**3. State Transition Logic (100% benefit)**

- **Task:** Implementing event/registration status changes
- **MCP Usage:**
  - Query `spec://state-machines`
  - Get valid transitions, guards, side effects
- **Benefit:** Impossible to implement invalid state transitions
- **Example Query:** `"What are all valid state transitions for the Event entity and their guard conditions?"`

**4. Validation Rules (85% benefit)**

- **Task:** Adding input validation and business rule checks
- **MCP Usage:**
  - Query `spec://invariants` for all constraints
  - Get validation rules by category
- **Benefit:** All constraints enforced, nothing missed
- **Example Query:** `"What are all capacity management invariants I need to enforce?"`

#### **Phase 2: Medium-Benefit Activities**

**5. API Route Creation (75% benefit)**

- **Task:** Creating Next.js API routes
- **MCP Usage:**
  - Map flows to endpoints using `spec://flows`
  - Get request/response schemas from `spec://commands`
- **Benefit:** Consistent API design, proper error handling
- **Example Query:** `"What command should the /api/events/:id/register endpoint invoke and what's the response format?"`

**6. UI Component Development (60% benefit)**

- **Task:** Building React components
- **MCP Usage:**
  - Check `impl://components` for existing components
  - Get user flows from `spec://flows` for UX logic
  - Retrieve error messages from commands
- **Benefit:** Reuse components, consistent UX, proper error display
- **Example Query:** `"What are the steps in the O-001 flow and what error messages should be shown?"`

**7. Database Migration Creation (80% benefit)**

- **Task:** Writing Supabase migrations
- **MCP Usage:**
  - Query `spec://entities` for table structure
  - Get constraints from `spec://invariants`
  - Check current schema from `impl://database-schema`
- **Benefit:** Schema matches conceptual model exactly
- **Example Query:** `"What are all the constraints for the Registration entity that need database enforcement?"`

#### **Phase 3: Lower-Benefit Activities**

**8. Styling/UI Polish (20% benefit)**

- **Task:** CSS/Tailwind styling
- **MCP Usage:**
  - Check conventions for class naming
  - Get responsive breakpoints from constraints
- **Benefit:** Consistent styling patterns
- **Limited:** Visual design is subjective

**9. Documentation Writing (50% benefit)**

- **Task:** Creating JSDoc comments, README
- **MCP Usage:**
  - Pull descriptions from spec
  - Generate examples from flows
- **Benefit:** Accurate documentation
- **Example Query:** `"What's the business purpose of the CheckIn entity?"`

**10. Testing (70% benefit)**

- **Task:** Writing unit/integration tests
- **MCP Usage:**
  - Use error cases from commands as test cases
  - Get invariants to test
  - Pull state transitions to test
- **Benefit:** Comprehensive test coverage
- **Example Query:** `"What are all the error cases for CMD-006: CheckInTicket?"`

---

### 8.5 MCP Setup Strategy for This Project

#### 8.5.1 Recommended MCP Server: Context7

**Why Context7:**

- Built for spec-driven development
- Supports markdown documentation exposure
- Can parse structured data from docs
- Query-optimized for LLM retrieval

#### 8.5.2 Setup Steps (Conceptual)

**Step 1: Project Structure Preparation**

```
EventManagement/
├── SPECIFICATION.md              ← Main spec (already exists)
├── mcp/                          ← MCP configuration folder
│   ├── server.config.json        ← MCP server settings
│   ├── resources/                ← Structured data extracts
│   │   ├── entities.json         ← Parsed from SPECIFICATION.md
│   │   ├── commands.json         ← Parsed from SPECIFICATION.md
│   │   ├── flows.json            ← Parsed from SPECIFICATION.md
│   │   ├── state-machines.json   ← Parsed from SPECIFICATION.md
│   │   ├── invariants.json       ← Parsed from SPECIFICATION.md
│   │   └── glossary.json         ← Domain terms
│   └── extractors/               ← Scripts to parse SPECIFICATION.md
│       └── parse-spec.ts         ← Converts MD to JSON
```

**Step 2: MCP Server Configuration**

Define resources in `mcp/server.config.json`:

```json
{
  "name": "event-management-context",
  "version": "1.0.0",
  "resources": [
    {
      "uri": "spec://specification",
      "type": "document",
      "path": "./SPECIFICATION.md",
      "description": "Complete system specification"
    },
    {
      "uri": "spec://entities",
      "type": "structured",
      "path": "./mcp/resources/entities.json",
      "schema": "./mcp/schemas/entity.schema.json"
    },
    {
      "uri": "spec://commands",
      "type": "structured",
      "path": "./mcp/resources/commands.json",
      "schema": "./mcp/schemas/command.schema.json"
    },
    {
      "uri": "project://structure",
      "type": "dynamic",
      "generator": "file-tree",
      "root": "./src"
    },
    {
      "uri": "impl://database-schema",
      "type": "dynamic",
      "generator": "supabase-schema-inspector",
      "connection": "${SUPABASE_URL}"
    }
  ],
  "indexes": [
    {
      "name": "entity-attributes",
      "source": "spec://entities",
      "fields": ["name", "attributes.*.name"]
    },
    {
      "name": "command-errors",
      "source": "spec://commands",
      "fields": ["name", "errorCases.*.code"]
    }
  ]
}
```

**Step 3: Resource Extraction**

Create parser script `mcp/extractors/parse-spec.ts`:

**Purpose:** Extract structured data from SPECIFICATION.md

**Extraction Logic:**

1. Parse markdown sections by heading level
2. Extract entity tables into JSON objects
3. Extract command specifications into structured format
4. Generate JSON files in `mcp/resources/`

**Run:** Before starting development, after spec updates

**Step 4: MCP Client Integration (IDE)**

**VS Code with Copilot/Claude:**

Configure `.vscode/settings.json`:

```json
{
  "mcp.servers": [
    {
      "name": "event-management-context",
      "command": "npx",
      "args": ["context7-server", "./mcp/server.config.json"],
      "env": {
        "SUPABASE_URL": "${env:SUPABASE_URL}"
      }
    }
  ],
  "github.copilot.advanced": {
    "contextProviders": ["mcp"]
  }
}
```

**Step 5: LLM Prompting Strategy**

**Always start coding sessions with:**

```
Prompt Template:
"Before writing any code, please:
1. Query the MCP server for [specific context needed]
2. Confirm your understanding by listing:
   - Relevant entities and their attributes
   - Commands being implemented
   - Constraints that must be enforced
3. Then proceed with implementation"
```

**Example:**

```
"I need to implement the event registration feature.

Before writing code:
1. Query spec://commands for CMD-004: RegisterForEvent
2. Query spec://entities for Registration and TicketType
3. Query spec://invariants for capacity management rules
4. Confirm you understand:
   - What inputs are required
   - What preconditions must be checked
   - What error cases must be handled
   - What transaction boundaries are needed
5. Then implement the registration service"
```

**Step 6: Validation Workflow**

**After LLM generates code:**

1. **LLM Self-Check:** Ask LLM to validate against spec
   - "Does this implementation satisfy all requirements from CMD-004?"
   - "Are all error cases from the spec handled?"

2. **Manual Review:** Developer checks key points
   - All invariants enforced?
   - State transitions valid?
   - Error messages match spec?

3. **Update MCP Context:** When code changes
   - Regenerate `impl://database-schema` after migrations
   - Update `impl://api-routes` after adding endpoints
   - Refresh `impl://components` after creating components

#### 8.5.3 MCP Maintenance Strategy

**Keep MCP Context Fresh:**

1. **Specification Updates**
   - When SPECIFICATION.md changes → Re-run extractor scripts
   - Regenerate JSON resources
   - Notify developers of context updates

2. **Implementation Progress**
   - After database migrations → Refresh schema context
   - After creating components → Update component catalog
   - After API changes → Regenerate OpenAPI spec

3. **Version Control**
   - Commit `mcp/resources/*.json` to git
   - CI/CD validates spec extracts are up-to-date
   - Pre-commit hook: Check if SPECIFICATION.md changed without updating resources

#### 8.5.4 Advanced MCP Features

**Query Examples LLM Can Use:**

```typescript
// Entity lookup
mcp.query("spec://entities", {
  filter: { name: "Event" },
});

// Find all commands for an actor
mcp.query("spec://commands", {
  filter: { actor: "Organizer" },
});

// Get invariants by category
mcp.query("spec://invariants", {
  filter: { category: "Capacity Management" },
});

// State machine transitions
mcp.query("spec://state-machines", {
  entity: "Event",
  from: "draft",
  to: "*", // All possible transitions from draft
});

// Find components by usage
mcp.query("impl://components", {
  search: "QR code",
});
```

**Semantic Search:**

If MCP server supports embeddings:

- "Find all validation rules related to event capacity"
- "What components handle user authentication?"
- "Show me all error cases that return HTTP 409"

---

### 8.6 Benefits Summary

**With MCP Integration:**

| Aspect                        | Without MCP                        | With MCP                         | Improvement |
| ----------------------------- | ---------------------------------- | -------------------------------- | ----------- |
| **Spec Adherence**            | 60-70% (memory-based)              | 95-100% (query-based)            | +35%        |
| **Field Hallucination**       | 15-20% of fields made up           | <1% (verified against spec)      | -95%        |
| **Missing Validations**       | 30-40% constraints missed          | <5% (all invariants available)   | -85%        |
| **Duplicate Code**            | 20% (LLM doesn't know what exists) | <5% (checks existing components) | -75%        |
| **Inconsistent Naming**       | 25% (varied patterns)              | <5% (follows conventions)        | -80%        |
| **Invalid State Transitions** | 10-15% (logic errors)              | <1% (state machine enforced)     | -93%        |
| **Development Speed**         | Baseline                           | +40% (less debugging)            | +40%        |
| **Code Review Time**          | Baseline                           | -50% (fewer spec violations)     | -50%        |

**ROI Calculation:**

- **Setup Cost:** 4-8 hours (one-time)
- **Maintenance:** 1-2 hours per week
- **Savings:**
  - 30% fewer bugs from spec violations
  - 40% faster development (less guessing)
  - 50% faster code review (less back-and-forth)

**For a 10-week project:**

- Traditional: ~400 dev hours
- With MCP: ~280 dev hours (120 hours saved)
- **Net Benefit:** ~110 hours saved (accounting for setup/maintenance)

---

### 8.7 MCP Best Practices for This Project

**DO:**

- ✅ Always query MCP before implementing any command
- ✅ Validate generated code against spec after writing
- ✅ Keep MCP resources in sync with spec updates
- ✅ Use structured queries (JSON) over full-text when possible
- ✅ Regenerate dynamic context (schema, APIs) frequently
- ✅ Include MCP context in code review checklist

**DON'T:**

- ❌ Skip MCP and rely on LLM's training data (outdated, generic)
- ❌ Let spec and MCP resources drift out of sync
- ❌ Assume LLM "remembers" previous context (always query fresh)
- ❌ Override spec-based suggestions without documenting why
- ❌ Use MCP for subjective decisions (UI aesthetics, naming preferences)

**Golden Rule:**

> "If it's in the spec, it must be in MCP. If it's in MCP, the LLM must query it before coding."

---

**MCP Integration Status:** SPECIFIED  
**Setup Complexity:** Medium (4-8 hours initial setup)  
**Maintenance Effort:** Low (1-2 hours/week)  
**ROI:** High (110+ hours saved over 10-week project)  
**Recommended MCP Server:** Context7 or equivalent spec-driven MCP implementation

**Next Step:** Set up MCP server configuration and extract initial resources from SPECIFICATION.md

---

## 9. Technical Architecture

This section maps the approved specifications to a concrete technical implementation using Next.js, Supabase, and modern web standards. The architecture follows clean separation of concerns and domain-driven design principles.

### 9.1 Architecture Overview

**Architectural Pattern:** Layered monolith with clear boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client)                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Next.js Frontend (React Components)            │ │
│  │  • Server Components (data fetching)                   │ │
│  │  • Client Components (interactivity)                   │ │
│  │  • Route handlers (navigation)                         │ │
│  └────────────────────┬───────────────────────────────────┘ │
└───────────────────────┼─────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  API Routes  │ │ Server       │ │  Supabase    │
│  (Next.js)   │ │ Actions      │ │  Client      │
│              │ │ (Server)     │ │  (Direct)    │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │    Command Layer      │
            │  (Business Logic)     │
            │  • CMD-001 - CMD-010  │
            └───────────┬───────────┘
                        │
            ┌───────────┼───────────┐
            │           │           │
            ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Supabase │ │ Supabase │ │ Supabase │
    │   Auth   │ │ Database │ │ Storage  │
    └──────────┘ └──────────┘ └──────────┘
                      │
                      ▼
              ┌──────────────┐
              │  PostgreSQL  │
              │  (with RLS)  │
              └──────────────┘
```

**Key Principles:**

- **Server-First:** Most logic runs on server (security, validation)
- **Client Enhancement:** Client adds interactivity (QR scanner, real-time updates)
- **Command Pattern:** All state changes go through defined commands
- **Row-Level Security:** Database enforces authorization

---

### 9.2 Frontend Responsibilities (Next.js App Router)

The frontend is responsible for **presentation, user interaction, and client-side state management**.

#### 9.2.1 Application Structure

```
src/app/                              ← Next.js App Router root
├── (public)/                         ← Public routes (no auth required)
│   ├── page.tsx                      → Home page (event discovery)
│   ├── events/
│   │   ├── page.tsx                  → Event listing with filters
│   │   └── [slug]/
│   │       └── page.tsx              → Event detail + registration
│   ├── login/
│   │   └── page.tsx                  → Sign in page
│   └── signup/
│       └── page.tsx                  → Sign up page
│
├── (authenticated)/                  ← Protected routes (require auth)
│   ├── dashboard/
│   │   ├── page.tsx                  → My tickets overview
│   │   ├── tickets/
│   │   │   ├── page.tsx              → All tickets list
│   │   │   └── [id]/
│   │   │       └── page.tsx          → Single ticket detail (QR code)
│   │   └── profile/
│   │       └── page.tsx              → User profile settings
│   │
│   ├── organizer/
│   │   ├── page.tsx                  → Organizer dashboard
│   │   ├── events/
│   │   │   ├── page.tsx              → My events list
│   │   │   ├── new/
│   │   │   │   └── page.tsx          → Create event form
│   │   │   └── [id]/
│   │   │       ├── page.tsx          → Event management overview
│   │   │       ├── edit/
│   │   │       │   └── page.tsx      → Edit event form
│   │   │       ├── attendees/
│   │   │       │   └── page.tsx      → Attendee list + stats
│   │   │       └── stats/
│   │   │           └── page.tsx      → Analytics dashboard
│   │
│   └── staff/
│       ├── page.tsx                  → Staff dashboard
│       └── events/
│           └── [id]/
│               ├── checkin/
│               │   └── page.tsx      → QR scanner interface
│               ├── manual/
│               │   └── page.tsx      → Manual check-in search
│               └── stats/
│                   └── page.tsx      → Real-time check-in stats
│
└── api/                              ← API routes (server-side)
    ├── events/
    │   ├── route.ts                  → GET /api/events (list)
    │   │                             → POST /api/events (create)
    │   └── [id]/
    │       ├── route.ts              → GET, PATCH, DELETE
    │       ├── publish/
    │       │   └── route.ts          → POST /api/events/:id/publish
    │       ├── cancel/
    │       │   └── route.ts          → POST /api/events/:id/cancel
    │       ├── register/
    │       │   └── route.ts          → POST /api/events/:id/register
    │       ├── attendees/
    │       │   └── route.ts          → GET /api/events/:id/attendees
    │       └── stats/
    │           └── route.ts          → GET /api/events/:id/stats
    │
    ├── registrations/
    │   ├── route.ts                  → GET /api/registrations (my tickets)
    │   └── [id]/
    │       ├── route.ts              → GET, DELETE (cancel)
    │       └── ticket/
    │           └── route.ts          → GET /api/registrations/:id/ticket (PDF)
    │
    └── checkin/
        ├── validate/
        │   └── route.ts              → POST /api/checkin/validate
        └── [eventId]/
            └── route.ts              → POST /api/checkin/:eventId
```

#### 9.2.2 Component Architecture

**Component Categories:**

1. **Server Components (Default)** - Data fetching, no interactivity
   - `EventList` - Fetches and displays events
   - `EventDetails` - Shows event information
   - `AttendeeTable` - Displays attendee list
   - `StatsDisplay` - Shows analytics

2. **Client Components** - Interactivity required (`"use client"`)
   - `EventRegistrationForm` - Form submission, validation
   - `QRCodeScanner` - Camera access, QR decoding
   - `QRCodeDisplay` - Renders QR code from data
   - `FilterPanel` - Interactive filters with URL state
   - `RealtimeCheckInFeed` - Supabase Realtime subscription

3. **Layout Components** - Shared UI structure
   - `PublicLayout` - Header/footer for public pages
   - `DashboardLayout` - Sidebar navigation for authenticated users
   - `OrganizerLayout` - Organizer-specific navigation
   - `StaffLayout` - Staff-specific tools

**Component Responsibilities:**

```typescript
// Server Component Pattern (data fetching)
// src/app/events/page.tsx
async function EventListingPage() {
  // Fetch data directly from Supabase (server-side)
  const events = await getPublishedEvents();

  return (
    <div>
      <EventFilters /> {/* Client component for interaction */}
      <EventGrid events={events} /> {/* Server component for display */}
    </div>
  );
}

// Client Component Pattern (interactivity)
// src/components/events/EventRegistrationForm.tsx
"use client";

function EventRegistrationForm({ eventId, ticketTypes }) {
  // Client-side state
  const [selectedType, setSelectedType] = useState(null);

  // Form submission calls API route
  async function handleSubmit() {
    const response = await fetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      body: JSON.stringify({ ticketTypeId: selectedType })
    });
    // Handle response
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### 9.2.3 Frontend Data Flow

**Pattern: Server Component → API Route → Command**

```
1. User Action (Click "Register")
   ↓
2. Client Component (EventRegistrationForm)
   - Validates input
   - Calls fetch('/api/events/:id/register')
   ↓
3. API Route (src/app/api/events/[id]/register/route.ts)
   - Extracts user from session
   - Validates request body
   - Calls RegisterForEvent command
   ↓
4. Command Layer (src/lib/commands/registerForEvent.ts)
   - Executes CMD-004 logic
   - Interacts with Supabase
   - Returns result
   ↓
5. API Route
   - Returns JSON response
   ↓
6. Client Component
   - Updates UI
   - Shows success/error message
   - Redirects to ticket page
```

#### 9.2.4 State Management Strategy

**Server State (Database):**

- Source of truth: Supabase PostgreSQL
- Accessed via: Supabase Client, API routes
- Caching: Next.js built-in caching, revalidation

**Client State:**

- **Form State:** React Hook Form (uncontrolled forms)
- **UI State:** React `useState` (modals, dropdowns, local toggles)
- **URL State:** Next.js `useSearchParams` (filters, pagination)
- **Real-time State:** Supabase Realtime subscriptions (check-in feed)

**No Global State Library Needed:**

- Server Components fetch fresh data
- Client Components use local state
- Form state managed by React Hook Form
- Real-time via Supabase subscriptions

#### 9.2.5 Authentication Flow (Frontend)

**Supabase Auth Integration:**

```typescript
// Middleware checks auth on protected routes
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);

  // Refresh session if needed
  await supabase.auth.getSession();

  // Check if route requires auth
  if (isProtectedRoute(request.nextUrl.pathname)) {
    const user = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect('/login');
    }
  }

  return response;
}

// Protected route pattern
// src/app/(authenticated)/dashboard/page.tsx
async function DashboardPage() {
  const supabase = createServerClient(); // Server component
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch user's registrations
  const registrations = await getMyRegistrations(user.id);

  return <TicketList registrations={registrations} />;
}
```

#### 9.2.6 Client-Side Responsibilities Summary

| Responsibility        | Implementation               | Examples                          |
| --------------------- | ---------------------------- | --------------------------------- |
| **Routing**           | Next.js App Router           | File-based routing, layouts       |
| **Data Fetching**     | Server Components + Supabase | `getPublishedEvents()`            |
| **User Interaction**  | Client Components            | Forms, buttons, modals            |
| **Form Validation**   | React Hook Form + Zod        | Registration form, event creation |
| **Real-time Updates** | Supabase Realtime            | Check-in feed, stats updates      |
| **QR Code Scanning**  | @zxing/browser               | Camera access, QR decoding        |
| **QR Code Display**   | qrcode.react                 | Generate QR from data             |
| **Authentication UI** | Supabase Auth                | Login, signup, password reset     |
| **Error Handling**    | Error boundaries             | Graceful error display            |
| **Loading States**    | React Suspense               | Loading skeletons                 |

**Frontend Does NOT:**

- ❌ Execute business logic (commands)
- ❌ Enforce invariants (except client-side validation for UX)
- ❌ Direct database access (always via API or Server Components)
- ❌ Store sensitive data (tokens in httpOnly cookies only)

---

### 9.3 Backend Responsibilities (API Routes)

The backend is responsible for **business logic execution, validation, and orchestration**.

#### 9.3.1 API Route Structure

**Pattern:** One route file per resource + action

**Naming Convention:**

- `route.ts` - Standard CRUD operations
- `[action]/route.ts` - Custom actions (publish, cancel, register)

**Route Responsibilities:**

1. **Authentication** - Verify user session
2. **Authorization** - Check user permissions
3. **Input Validation** - Validate request body with Zod
4. **Command Invocation** - Call appropriate command
5. **Error Handling** - Map errors to HTTP responses
6. **Response Formatting** - Return consistent JSON

**Example Route Structure:**

```typescript
// src/app/api/events/[id]/register/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { registerForEvent } from "@/lib/commands/registerForEvent";
import { z } from "zod";

// Request schema validation
const RegisterRequestSchema = z.object({
  ticketTypeId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // 1. Authentication
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHENTICATED", message: "Please sign in" },
        },
        { status: 401 },
      );
    }

    // 2. Parse and validate input
    const body = await request.json();
    const validation = RegisterRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: validation.error.message },
        },
        { status: 400 },
      );
    }

    // 3. Invoke command (business logic)
    const result = await registerForEvent({
      eventId: params.id,
      userId: user.id,
      ticketTypeId: validation.data.ticketTypeId,
    });

    // 4. Return success response
    return NextResponse.json(
      {
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 201 },
    );
  } catch (error) {
    // 5. Error handling
    return handleApiError(error);
  }
}
```

#### 9.3.2 API Routes vs Server Actions

**When to Use API Routes:**

- ✅ External integrations might call (webhooks)
- ✅ Need explicit HTTP status codes
- ✅ RESTful API design preferred
- ✅ CORS handling required
- ✅ Rate limiting needed

**When to Use Server Actions:**

- ✅ Form submissions from React
- ✅ Simpler syntax (no fetch needed)
- ✅ Progressive enhancement
- ✅ Type-safe by default

**Recommended Approach for This Project:**

- **API Routes** for all command operations (consistency, external access)
- **Server Actions** for simple data fetches in Server Components
- **Hybrid:** Server Components call Server Actions for reads, Client Components call API routes for writes

#### 9.3.3 Command Layer Integration

**All API routes delegate to command layer:**

```
API Route Responsibilities:
├── Extract user from session (authentication)
├── Validate user permissions (authorization)
├── Parse request body
├── Validate input schema (Zod)
└── Invoke command
    ↓
Command Layer Responsibilities:
├── Business logic execution
├── Invariant enforcement
├── Database transactions
├── Domain event emission
└── Return typed result
```

**Example Command Mapping:**

| API Endpoint               | HTTP Method | Command                                | Flow  |
| -------------------------- | ----------- | -------------------------------------- | ----- |
| `/api/events`              | POST        | CMD-001: CreateEvent                   | O-001 |
| `/api/events/:id`          | PATCH       | CMD-002: ConfigureTicketType (partial) | O-002 |
| `/api/events/:id/publish`  | POST        | CMD-003: PublishEvent                  | O-001 |
| `/api/events/:id/register` | POST        | CMD-004: RegisterForEvent              | A-002 |
| `/api/registrations/:id`   | DELETE      | CMD-010: CancelRegistration            | A-004 |
| `/api/events/:id/cancel`   | POST        | CMD-009: CancelEvent                   | O-004 |
| `/api/checkin/:eventId`    | POST        | CMD-006: CheckInTicket                 | S-001 |

**No Direct Database Access in Routes:**

- API routes NEVER query Supabase directly
- All database access goes through command layer
- Commands encapsulate business logic and transactions

#### 9.3.4 Error Response Mapping

**Standard Error Response Format:**

```typescript
{
  success: false,
  error: {
    code: string,        // Machine-readable error code
    message: string,     // User-friendly message
    details?: object     // Additional context (validation errors, etc.)
  },
  meta: {
    timestamp: string    // ISO 8601 timestamp
  }
}
```

**Error Code to HTTP Status Mapping:**

| Error Category      | Example Codes                                           | HTTP Status |
| ------------------- | ------------------------------------------------------- | ----------- |
| Authentication      | `UNAUTHENTICATED`, `SESSION_EXPIRED`                    | 401         |
| Authorization       | `UNAUTHORIZED`, `FORBIDDEN`                             | 403         |
| Not Found           | `EVENT_NOT_FOUND`, `REGISTRATION_NOT_FOUND`             | 404         |
| Validation          | `INVALID_INPUT`, `INVALID_TITLE_LENGTH`                 | 400         |
| Conflict            | `CAPACITY_EXCEEDED`, `DUPLICATE_REGISTRATION`           | 409         |
| Business Rule       | `CANCELLATION_DEADLINE_PASSED`, `EVENT_ALREADY_STARTED` | 400         |
| Server Error        | `DATABASE_ERROR`, `QR_GENERATION_FAILED`                | 500         |
| Service Unavailable | `EMAIL_SERVICE_ERROR`, `NETWORK_ERROR`                  | 503         |

---

### 9.4 Supabase Usage

Supabase provides **authentication, database, and storage** - the core data and security infrastructure.

#### 9.4.1 Supabase Auth

**Responsibilities:**

- User registration and login
- Session management (JWT tokens)
- Email verification
- Password reset
- OAuth providers (optional: Google, GitHub)

**Implementation Pattern:**

```typescript
// User signup
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password",
  options: {
    data: {
      full_name: "John Doe",
      phone: "+1234567890",
    },
    emailRedirectTo: "https://app.example.com/auth/callback",
  },
});

// User login
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password",
});

// Get current user (server component)
const {
  data: { user },
} = await supabase.auth.getUser();

// Sign out
await supabase.auth.signOut();
```

**Session Storage:**

- Tokens stored in httpOnly cookies (secure)
- Session refresh handled automatically by Supabase middleware
- No manual token management needed

**User Profile Extension:**

```typescript
// After signup, create profile in public.profiles table
// Triggered by database trigger or explicit API call
await supabase.from("profiles").insert({
  id: user.id, // Same as auth.users.id
  email: user.email,
  full_name: metadata.full_name,
  phone: metadata.phone,
  role: "attendee", // Default role
});
```

**Role Management:**

Roles stored in `profiles.role` column:

- `attendee` - Default role for new users
- `organizer` - Elevated via admin action
- `staff` - Assigned by organizers
- `admin` - System administrators (manual assignment)

**Auth Integration Points:**

| Component         | Auth Usage                                          |
| ----------------- | --------------------------------------------------- |
| API Routes        | `createServerClient()` → `auth.getUser()`           |
| Server Components | `createServerClient()` → `auth.getUser()`           |
| Client Components | `createBrowserClient()` → `auth.getSession()`       |
| Middleware        | `createMiddlewareClient()` → redirect if not authed |

#### 9.4.2 Supabase Database

**Responsibilities:**

- Data persistence (PostgreSQL)
- Row-Level Security (RLS) enforcement
- Transaction management
- Full-text search
- Triggers for automation

**Database Access Patterns:**

**From Server Components (read-only):**

```typescript
// Direct Supabase query
async function EventDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createServerClient();

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      ticket_types (*),
      organizer:profiles!organizer_id (full_name, avatar_url)
    `)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single();

  if (error || !event) notFound();

  return <EventDetails event={event} />;
}
```

**From Commands (read-write):**

```typescript
// Command with transaction
export async function registerForEvent(input: RegisterInput) {
  const supabase = createServiceClient(); // Service role for bypassing RLS

  // Begin transaction (using Supabase RPC or raw SQL)
  const { data, error } = await supabase.rpc("register_for_event", {
    p_event_id: input.eventId,
    p_user_id: input.userId,
    p_ticket_type_id: input.ticketTypeId,
  });

  // RPC function handles:
  // - Capacity check
  // - Registration creation
  // - Decrement available tickets
  // - QR generation
  // All in single transaction

  if (error) throw mapDatabaseError(error);

  return data;
}
```

**Row-Level Security (RLS) Policies:**

RLS enforces authorization at the database level:

```sql
-- Example RLS policy for events table

-- Anyone can read published events
CREATE POLICY "Public events are viewable"
ON events FOR SELECT
USING (status = 'published');

-- Organizers can read their own events (any status)
CREATE POLICY "Organizers view own events"
ON events FOR SELECT
USING (auth.uid() = organizer_id);

-- Organizers can update their own events
CREATE POLICY "Organizers update own events"
ON events FOR UPDATE
USING (auth.uid() = organizer_id)
WITH CHECK (auth.uid() = organizer_id);

-- Only organizers can create events
CREATE POLICY "Organizers create events"
ON events FOR INSERT
WITH CHECK (
  auth.uid() = organizer_id AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('organizer', 'admin')
  )
);
```

**Database Client Types:**

1. **Server Client** (inherits user session, RLS enforced)
   - Used in: Server Components, API routes
   - RLS: Active
   - Use for: User-scoped queries

2. **Service Client** (service role, bypasses RLS)
   - Used in: Command layer, background jobs
   - RLS: Bypassed
   - Use for: Admin operations, cross-user queries

```typescript
// Server client (RLS enforced)
const supabase = createServerClient();

// Service client (RLS bypassed - use carefully!)
const supabaseService = createServiceClient();
```

**Database Triggers:**

Automate domain logic at database level:

```sql
-- Auto-create profile after user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Update event updated_at timestamp
CREATE TRIGGER update_event_timestamp
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

#### 9.4.3 Supabase Storage

**Responsibilities:**

- Event cover image storage
- Generated ticket PDFs (optional)
- User avatar uploads

**Bucket Structure:**

```
Supabase Storage:
├── event-images/                 ← Public bucket
│   ├── {eventId}/
│   │   ├── cover.jpg            ← Event cover image
│   │   └── thumbnail.jpg        ← Resized thumbnail
│
├── avatars/                      ← Public bucket
│   └── {userId}.jpg             ← User profile picture
│
└── tickets/                      ← Private bucket (auth required)
    └── {registrationId}.pdf     ← Generated ticket PDF
```

**Upload Pattern (Event Image):**

```typescript
// From API route (event creation)
export async function uploadEventImage(
  file: File,
  eventId: string,
): Promise<string> {
  const supabase = createServerClient();

  // Generate unique filename
  const fileName = `${eventId}/cover.${file.type.split("/")[1]}`;

  // Upload to storage
  const { data, error } = await supabase.storage
    .from("event-images")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) throw new Error("Image upload failed");

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("event-images").getPublicUrl(fileName);

  return publicUrl;
}
```

**Storage Policies (RLS):**

```sql
-- Anyone can read event images (public bucket)
CREATE POLICY "Event images are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

-- Organizers can upload to their event folders
CREATE POLICY "Organizers upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM events WHERE organizer_id = auth.uid()
  )
);

-- Users can only access their own tickets
CREATE POLICY "Users access own tickets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tickets' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM registrations WHERE user_id = auth.uid()
  )
);
```

#### 9.4.4 Supabase Realtime

**Responsibilities:**

- Live check-in feed for staff
- Real-time statistics updates
- Attendee count updates

**Realtime Subscription Pattern:**

```typescript
// Client component for check-in feed
"use client";

function CheckInFeed({ eventId }: { eventId: string }) {
  const [checkIns, setCheckIns] = useState([]);
  const supabase = createBrowserClient();

  useEffect(() => {
    // Subscribe to check_ins table for this event
    const channel = supabase
      .channel(`check-ins:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'check_ins',
          filter: `registration.event_id=eq.${eventId}`
        },
        (payload) => {
          // New check-in received
          setCheckIns(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return (
    <div>
      {checkIns.map(checkIn => (
        <CheckInItem key={checkIn.id} checkIn={checkIn} />
      ))}
    </div>
  );
}
```

**Realtime Channels:**

| Channel                   | Event Type              | Use Case                               |
| ------------------------- | ----------------------- | -------------------------------------- |
| `check-ins:{eventId}`     | INSERT on check_ins     | Live check-in feed for staff           |
| `registrations:{eventId}` | INSERT on registrations | Live registration count for organizers |
| `event-stats:{eventId}`   | UPDATE on events        | Capacity/stats changes                 |

---

### 9.5 Command-to-API Boundary Mapping

This section maps each domain command to its API endpoint and execution flow.

#### 9.5.1 Command Execution Architecture

**Pattern: API Gateway → Command Handler → Database**

```
┌─────────────────┐
│   API Route     │  ← HTTP layer (authentication, validation)
│  /api/events    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Command Handler │  ← Business logic layer
│  createEvent()  │
└────────┬────────┘
         │
         ├─────────────┬──────────────┬─────────────┐
         ▼             ▼              ▼             ▼
    ┌────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
    │Validate│   │ Generate│   │  Store  │   │  Emit   │
    │ Input  │   │  Slug   │   │   DB    │   │  Event  │
    └────────┘   └─────────┘   └─────────┘   └─────────┘
```

#### 9.5.2 Complete Command Mapping

**Event Management Commands:**

| Command                                   | API Endpoint                           | HTTP Method | Request Location       | Response Status |
| ----------------------------------------- | -------------------------------------- | ----------- | ---------------------- | --------------- |
| **CMD-001: CreateEvent**                  | `/api/events`                          | POST        | Body                   | 201 Created     |
| **CMD-002: ConfigureTicketType**          | `/api/events/:id/ticket-types`         | POST        | Body                   | 201 Created     |
| **CMD-002: ConfigureTicketType** (update) | `/api/events/:id/ticket-types/:typeId` | PATCH       | Body                   | 200 OK          |
| **CMD-003: PublishEvent**                 | `/api/events/:id/publish`              | POST        | Params                 | 200 OK          |
| **CMD-009: CancelEvent**                  | `/api/events/:id/cancel`               | POST        | Params + Body (reason) | 200 OK          |

**Ticketing Commands:**

| Command                           | API Endpoint                  | HTTP Method | Request Location | Response Status |
| --------------------------------- | ----------------------------- | ----------- | ---------------- | --------------- |
| **CMD-004: RegisterForEvent**     | `/api/events/:id/register`    | POST        | Params + Body    | 201 Created     |
| **CMD-005: GenerateTicketQRCode** | (Internal, called by CMD-004) | N/A         | N/A              | N/A             |
| **CMD-010: CancelRegistration**   | `/api/registrations/:id`      | DELETE      | Params           | 200 OK          |
| **CMD-008: SendEventReminder**    | (Cron job, not API)           | N/A         | N/A              | N/A             |

**Access Control Commands:**

| Command                          | API Endpoint                  | HTTP Method | Request Location       | Response Status |
| -------------------------------- | ----------------------------- | ----------- | ---------------------- | --------------- |
| **CMD-006: CheckInTicket**       | `/api/checkin/:eventId`       | POST        | Params + Body (qrData) | 200 OK          |
| **CMD-007: ValidateQRSignature** | (Internal, called by CMD-006) | N/A         | N/A                    | N/A             |

#### 9.5.3 Detailed API-Command Flows

**Example 1: CMD-001 CreateEvent**

```
Request:
  POST /api/events
  Authorization: Bearer {jwt}
  Content-Type: application/json

  {
    "title": "Tech Conference 2026",
    "description": "Annual tech gathering",
    "startDate": "2026-06-15T09:00:00Z",
    "endDate": "2026-06-15T17:00:00Z",
    "location": "Convention Center, NYC",
    "capacity": 500,
    "imageFile": File (multipart if image included)
  }

API Route Flow:
  1. Extract user from session (auth.getUser())
  2. Check user.role === 'organizer'
  3. Validate request body with Zod schema
  4. If imageFile present, upload to Supabase Storage
  5. Call createEvent command:

     await createEvent({
       organizerId: user.id,
       title: validatedData.title,
       description: validatedData.description,
       startDate: validatedData.startDate,
       endDate: validatedData.endDate,
       location: validatedData.location,
       capacity: validatedData.capacity,
       imageUrl: uploadedImageUrl
     })

  6. Command executes:
     - Validates invariants (startDate > now, endDate > startDate)
     - Generates slug
     - Creates event record (status = 'draft')
     - Emits EventCreated domain event

  7. Return response:
     {
       "success": true,
       "data": {
         "eventId": "uuid",
         "slug": "tech-conference-2026",
         "status": "draft",
         "imageUrl": "https://...",
         "createdAt": "2026-02-06T..."
       }
     }

Response:
  201 Created
```

**Example 2: CMD-004 RegisterForEvent**

```
Request:
  POST /api/events/{eventId}/register
  Authorization: Bearer {jwt}
  Content-Type: application/json

  {
    "ticketTypeId": "uuid"
  }

API Route Flow:
  1. Extract user from session
  2. Validate user is authenticated
  3. Validate request body
  4. Call registerForEvent command:

     await registerForEvent({
       eventId: params.eventId,
       userId: user.id,
       ticketTypeId: validatedData.ticketTypeId
     })

  5. Command executes (in transaction):
     - Lock ticket_type row (SELECT FOR UPDATE)
     - Check available > 0
     - Check capacity not exceeded
     - Check no duplicate registration
     - Create registration record
     - Call GenerateTicketQRCode (CMD-005):
       * Generate signature: HMAC(eventId:regId:timestamp)
       * Format: eventId:regId:timestamp:signature
     - Decrement ticket_type.available
     - Commit transaction
     - Queue confirmation email (async)
     - Emit RegistrationCreated, TicketIssued events

  6. Return response:
     {
       "success": true,
       "data": {
         "registrationId": "uuid",
         "ticketCode": "uuid",
         "qrData": "eventId:regId:timestamp:signature",
         "status": "confirmed",
         "eventDetails": { ... }
       }
     }

Response:
  201 Created
```

**Example 3: CMD-006 CheckInTicket**

```
Request:
  POST /api/checkin/{eventId}
  Authorization: Bearer {jwt} (staff)
  Content-Type: application/json

  {
    "qrData": "eventId:regId:timestamp:signature",
    "method": "qr",
    "location": "Main Entrance"
  }

API Route Flow:
  1. Extract staff user from session
  2. Verify user.role === 'staff'
  3. Verify staff assigned to event:
     SELECT FROM staff_assignments
     WHERE event_id = eventId AND staff_id = user.id
  4. Validate request body
  5. Call checkInTicket command:

     await checkInTicket({
       qrData: validatedData.qrData,
       eventId: params.eventId,
       staffId: user.id,
       method: validatedData.method,
       location: validatedData.location
     })

  6. Command executes:
     - Parse QR data
     - Call ValidateQRSignature (CMD-007):
       * Recompute signature
       * Constant-time comparison
       * Return isValid
     - If invalid: throw INVALID_QR_CODE
     - Verify eventId matches
     - Check time window
     - Query registration
     - Check status === 'confirmed'
     - Begin transaction:
       * Update registration.status = 'checked_in'
       * Set checked_in_at, checked_in_by
       * Insert check_ins record
     - Commit
     - Emit AttendeeCheckedIn event

  7. Return response:
     {
       "success": true,
       "registration": {
         "id": "uuid",
         "attendeeName": "John Doe",
         "ticketType": "VIP",
         "checkedInAt": "2026-06-15T09:05:00Z"
       },
       "message": "Welcome!"
     }

Response:
  200 OK

  (Or if already checked in:)
  409 Conflict
  {
    "success": false,
    "error": {
      "code": "ALREADY_CHECKED_IN",
      "message": "Already checked in at 09:03:00",
      "details": { "checkedInAt": "2026-06-15T09:03:00Z" }
    }
  }
```

#### 9.5.4 Background Jobs (Non-API Commands)

**CMD-008: SendEventReminder**

- **Trigger:** Cron job (Supabase Edge Function or Vercel Cron)
- **Schedule:**
  - Hourly: Check for events 23-24h before start
  - Every 15 min: Check for events 1h45m-2h15m before start
- **Execution:**
  - Edge Function queries events in time window
  - For each event, query confirmed registrations
  - Generate personalized emails
  - Queue via email service (Resend/SendGrid)
  - Mark reminder as sent in event_reminders table

**Cron Configuration (Vercel):**

```typescript
// src/app/api/cron/send-reminders/route.ts
export const runtime = "edge";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Execute reminder command
  await sendEventReminders();

  return new Response("OK");
}
```

**Vercel Config (vercel.json):**

```json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 * * * *" // Every hour
    }
  ]
}
```

---

### 9.6 Architecture Decision Records (ADRs)

**Key architectural decisions and rationale:**

#### ADR-001: Use Next.js App Router over Pages Router

**Decision:** Use Next.js 14+ App Router for all routing

**Rationale:**

- Server Components reduce client bundle size
- Better data fetching patterns (async components)
- Improved nested layouts
- Future-proof (official Next.js direction)

**Trade-offs:**

- Steeper learning curve (new paradigm)
- Some libraries may not be compatible yet

#### ADR-002: Command Pattern for All State Changes

**Decision:** All database writes must go through command layer

**Rationale:**

- Enforces business rules consistently
- Single location for validation logic
- Easier to test business logic
- Supports domain event emission

**Trade-offs:**

- Extra abstraction layer
- Slightly more code than direct DB access

#### ADR-003: API Routes over Server Actions for Commands

**Decision:** Use API routes (not Server Actions) for command execution

**Rationale:**

- Explicit HTTP semantics
- Easier to add rate limiting
- Better error handling with HTTP status codes
- Potential external API consumers

**Trade-offs:**

- More boilerplate (fetch calls)
- Server Actions would be simpler for forms

#### ADR-004: Supabase RLS as Primary Authorization

**Decision:** Rely on Supabase Row-Level Security for data access control

**Rationale:**

- Defense in depth (database enforces security)
- Cannot bypass security by mistake
- Consistent across all query methods

**Trade-offs:**

- Requires careful RLS policy design
- Debugging can be harder (policies hide data)

#### ADR-005: Service Client for Commands, Server Client for Reads

**Decision:** Commands use service role (bypass RLS), reads use user session

**Rationale:**

- Commands need cross-user operations (e.g., decrement ticket count)
- Reads respect user permissions automatically
- Clear separation of concerns

**Trade-offs:**

- Must be careful with service client (can access everything)
- Need manual authorization checks in commands

---

**Technical Architecture Status:** COMPLETE  
**Frontend:** Next.js App Router with Server/Client Components  
**Backend:** API Routes + Command Layer  
**Database:** Supabase PostgreSQL with RLS  
**Auth:** Supabase Auth with session management  
**Storage:** Supabase Storage for images  
**Real-time:** Supabase Realtime for check-in feed

**Next Step:** Begin implementation with database schema migration

---

**Document Status:** APPROVED  
**Next Step:** Proceed to detailed design (database schema, API contracts, UI mockups)
