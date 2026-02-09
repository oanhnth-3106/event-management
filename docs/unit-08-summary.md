# Unit 8: Email Templates

## Overview

This unit implements the complete email notification system for the Event Management application. It includes email templates, sending infrastructure, and integration with the command layer for automated notifications.

**Key Features:**

- React-based email templates with type safety
- Multi-provider support (Resend, SendGrid, NodeMailer)
- HTML and plain text email generation
- Background email queue
- Email helper functions for common scenarios

---

## Architecture

### Email System Components

```
src/lib/email/
├── config.ts                  # Email provider configuration
├── client.ts                  # Email sending client (multi-provider)
├── render.ts                  # React to HTML rendering
├── helpers.ts                 # High-level send functions
├── queue.ts                   # Background email queue
├── index.ts                   # Barrel export
└── templates/
    ├── base.tsx              # Base email layout
    ├── registration-confirmation.tsx
    ├── event-reminder.tsx
    ├── event-cancelled.tsx
    └── index.ts              # Template exports
```

---

## Email Configuration

**File:** `src/lib/email/config.ts` (~130 lines)

**Environment Variables:**

```bash
# Email Provider (resend, sendgrid, nodemailer)
EMAIL_PROVIDER=resend

# From Address (must be verified domain)
EMAIL_FROM=noreply@eventhub.com
EMAIL_FROM_NAME=EventHub

# Support Email
EMAIL_SUPPORT=support@eventhub.com

# Provider-specific API Keys
RESEND_API_KEY=re_xxxxx           # Resend (recommended)
SENDGRID_API_KEY=SG.xxxxx         # SendGrid
SMTP_HOST=smtp.gmail.com          # NodeMailer/SMTP
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=yourpassword
```

**Features:**

- Multi-provider support (easy switching)
- Centralized configuration
- Configuration validation
- URL builders for email links

---

## Email Client

**File:** `src/lib/email/client.ts` (~190 lines)

### Supported Providers

**1. Resend (Recommended)**

- Modern API, great DX
- Generous free tier
- Excellent deliverability
- React Email support

**2. SendGrid**

- Enterprise-grade
- Advanced analytics
- Template management
- Large scale support

**3. NodeMailer (SMTP)**

- Use any SMTP provider
- Gmail, Outlook, custom servers
- Maximum flexibility
- Self-hosted options

### Email Interface

```typescript
interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  type?: EmailType;
  priority?: EmailPriority;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}
```

### Usage Example

```typescript
import { sendEmail, EmailType, EmailPriority } from "@/lib/email";

const result = await sendEmail({
  to: "user@example.com",
  subject: "Welcome to EventHub",
  html: "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
  text: "Welcome! Thanks for signing up.",
  type: EmailType.REGISTRATION_CONFIRMATION,
  priority: EmailPriority.HIGH,
});

if (result.success) {
  console.log("Email sent:", result.messageId);
} else {
  console.error("Email failed:", result.error);
}
```

---

## Email Templates

### Base Template

**File:** `src/lib/email/templates/base.tsx` (~185 lines)

**Features:**

- Consistent header with logo
- Footer with links and copyright
- Responsive design
- Email-safe inline CSS
- Reusable components (Button, InfoBox, WarningBox, Divider)

**Components:**

```typescript
<BaseEmail previewText="Email preview text">
  {/* Email content */}
</BaseEmail>

<Button href="/link" variant="primary">
  Click Here
</Button>

<InfoBox>Important information</InfoBox>

<WarningBox>Warning message</WarningBox>

<Divider />
```

---

### 1. Registration Confirmation Email

**File:** `src/lib/email/templates/registration-confirmation.tsx` (~160 lines)

**Sent When:** User successfully registers for an event

**Content:**

- Confirmation number (prominent display)
- Event details (date, time, location, ticket type, price)
- QR code access link (CTA button)
- Check-in instructions
- Reminder schedule (24h and 2h before event)
- Event details link

**Preview:**

```
Subject: Registration Confirmed: Tech Conference 2026

---
[EventHub Logo]

Registration Confirmed! 🎉

Hi John Doe,

Great news! Your registration for Tech Conference 2026 has been confirmed.

┌─────────────────────────┐
│ Confirmation Number:    │
│ TC2026-ABC123           │
└─────────────────────────┘

Event Details
━━━━━━━━━━━━━
Event:        Tech Conference 2026
Date & Time:  March 15, 2026 at 9:00 AM
Location:     San Francisco Convention Center
Ticket Type:  General Admission
Price:        $49.00

[View My Ticket & QR Code] [View Event Details]

💡 Pro tip: Save your ticket offline or take a screenshot
```

---

### 2. Event Reminder Email

**File:** `src/lib/email/templates/event-reminder.tsx` (~160 lines)

**Sent When:** 24 hours and 2 hours before event start

**Content:**

- Time remaining (countdown)
- Event details
- Check-in instructions (4-step process)
- QR code access link
- Different urgency levels (24h vs 2h)

**Preview (2h reminder):**

```
Subject: Reminder: Tech Conference 2026 in 2 hours

---
[EventHub Logo]

⏰ Event Reminder: Starting Soon!

Hi John Doe,

This is a friendly reminder that Tech Conference 2026 is happening soon!

┌─────────────────────────┐
│ Starts in: 2 hours      │
│ March 15, 2026 at 9:00 AM│
└─────────────────────────┘

Check-In Instructions
━━━━━━━━━━━━━━━━━━━━
1. Access your QR code ticket
2. Save it offline (screenshot recommended)
3. Arrive early (a few extra minutes for check-in)
4. Present your QR code at the entrance

[View My QR Code Ticket]

⚠️ Important: The event is starting in just 2 hours!
Make sure you have your QR code ready.
```

---

### 3. Event Cancelled Email

**File:** `src/lib/email/templates/event-cancelled.tsx` (~130 lines)

**Sent When:** Organizer cancels an event

**Content:**

- Cancellation notice (warning box)
- Cancellation reason (if provided)
- Organizer message (if provided)
- What it means for attendee (automatic refund, QR invalid)
- Browse other events CTA

**Preview:**

```
Subject: Event Cancelled: Tech Conference 2026

---
[EventHub Logo]

Event Cancelled ⚠️

Hi John Doe,

We regret to inform you that Tech Conference 2026 has been cancelled by the organizer.

┌─────────────────────────────────────────┐
│ ⚠️ Status: Cancelled                    │
│ Originally scheduled: March 15, 2026    │
└─────────────────────────────────────────┘

Cancellation Reason
━━━━━━━━━━━━━━━━━━
Venue unavailable due to unforeseen circumstances.

What This Means for You
━━━━━━━━━━━━━━━━━━━━━
✓ Your registration has been automatically cancelled
✓ You will not be charged (or will receive a full refund)
✓ Your QR code ticket is no longer valid
✓ No further action is required from you

[Browse Events] [View My Tickets]
```

---

## Email Rendering

**File:** `src/lib/email/render.ts` (~90 lines)

### React to HTML Conversion

Uses `react-dom/server` to render React components to HTML:

```typescript
import { renderEmailTemplate } from '@/lib/email/render';
import { RegistrationConfirmationEmail } from '@/lib/email/templates';

const html = renderEmailTemplate(
  <RegistrationConfirmationEmail
    userName="John Doe"
    eventTitle="Tech Conference"
    // ... other props
  />
);
```

### Plain Text Generation

Automatically generates plain text version from HTML:

```typescript
import { htmlToText } from "@/lib/email/render";

const text = htmlToText(html);
// Strips HTML tags, converts to readable plain text
```

**Features:**

- Converts `<br>` to newlines
- Converts links to "text (url)" format
- Decodes HTML entities
- Cleans up excessive whitespace
- Preserves list formatting

---

## Email Helpers

**File:** `src/lib/email/helpers.ts` (~140 lines)

High-level functions for sending specific email types:

### 1. Send Registration Confirmation

```typescript
import { sendRegistrationConfirmationEmail } from "@/lib/email/helpers";

await sendRegistrationConfirmationEmail(user, profile, registration);
```

**Used in:** `registerForEvent` command (CMD-004)

---

### 2. Send Event Reminder

```typescript
import { sendEventReminderEmail } from "@/lib/email/helpers";

await sendEventReminderEmail(user, profile, registration, "24h");
await sendEventReminderEmail(user, profile, registration, "2h");
```

**Used in:** `sendEventReminder` command (CMD-008), scheduled jobs

---

### 3. Send Event Cancelled (Bulk)

```typescript
import { notifyEventCancellation } from "@/lib/email/helpers";

const result = await notifyEventCancellation(
  event,
  attendees,
  "Venue unavailable",
  "We apologize for the inconvenience...",
);

console.log(`Sent to ${result.successCount} attendees`);
```

**Used in:** `cancelEvent` command (CMD-009)

---

### 4. Send Event Reminders (Bulk)

```typescript
import { sendEventReminders } from "@/lib/email/helpers";

const result = await sendEventReminders(event, registrations, "24h");

console.log(`Sent ${result.successCount} reminders`);
```

**Used in:** Scheduled jobs (cron, Vercel Cron, etc.)

---

## Email Queue

**File:** `src/lib/email/queue.ts` (~120 lines)

Background email queue to avoid blocking API responses.

### Queue Email for Background Sending

```typescript
import { queueEmail } from "@/lib/email/queue";

const emailId = queueEmail({
  to: "user@example.com",
  subject: "Welcome",
  html: "<h1>Welcome!</h1>",
  text: "Welcome!",
});

// API returns immediately, email sent in background
```

### Queue Features

- **FIFO Processing:** First in, first out
- **Automatic Retry:** Up to 3 attempts (configurable)
- **Error Logging:** Tracks failures for debugging
- **Monitoring:** `getQueueStatus()` for health checks
- **In-Memory (Dev):** Replace with Redis/BullMQ in production

### Production Replacement

For production, replace with proper job queue:

**Recommended:**

- **BullMQ** (Redis-based, best for Node.js)
- **Vercel Cron** (for scheduled reminders)
- **Inngest** (event-driven background jobs)
- **AWS SQS** (cloud-native queues)

---

## Integration with Commands

### CMD-004: Register for Event

```typescript
// In registerForEvent command
const registration = await createRegistration(/* ... */);

// Send confirmation email (queued)
queueEmail({
  to: user.email,
  ...renderRegistrationConfirmation({
    userName: profile.full_name,
    eventTitle: event.title,
    // ... other props
  }),
});
```

---

### CMD-008: Send Event Reminder

```typescript
// Scheduled job (runs 24h and 2h before events)
export async function sendEventReminder(input: SendEventReminderInput) {
  // Fetch all confirmed registrations for event
  const registrations = await fetchConfirmedRegistrations(input.eventId);

  // Send reminders in bulk
  const result = await sendEventReminders(
    event,
    registrations,
    input.reminderType,
  );

  // Mark reminder as sent in database
  await markReminderSent(input.eventId, input.reminderType);

  return { successCount: result.successCount };
}
```

---

### CMD-009: Cancel Event

```typescript
// In cancelEvent command
const event = await cancelEventInDb(eventId);

// Fetch all attendees
const attendees = await fetchEventAttendees(eventId);

// Notify all attendees (bulk)
await notifyEventCancellation(
  event,
  attendees,
  input.cancellationReason,
  input.organizerMessage,
);
```

---

## Email Types

```typescript
export enum EmailType {
  // Registration emails
  REGISTRATION_CONFIRMATION = "registration_confirmation",
  REGISTRATION_CANCELLED = "registration_cancelled",

  // Event reminders
  EVENT_REMINDER_24H = "event_reminder_24h",
  EVENT_REMINDER_2H = "event_reminder_2h",

  // Event updates
  EVENT_PUBLISHED = "event_published",
  EVENT_UPDATED = "event_updated",
  EVENT_CANCELLED = "event_cancelled",

  // Check-in confirmations
  CHECK_IN_CONFIRMATION = "check_in_confirmation",

  // Organizer notifications
  NEW_REGISTRATION = "new_registration",
  EVENT_CAPACITY_WARNING = "event_capacity_warning",

  // Staff notifications
  STAFF_ASSIGNMENT = "staff_assignment",

  // Admin notifications
  ADMIN_ALERT = "admin_alert",
}
```

---

## Scheduled Email Jobs

### 24-Hour Reminder Job

**Runs:** Daily at 9:00 AM (send to events starting in 24 hours)

```typescript
// Vercel Cron: /api/cron/send-24h-reminders
export async function GET() {
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 24);

  // Find events starting in ~24 hours
  const events = await findEventsStarting(tomorrow);

  for (const event of events) {
    await sendEventReminder({
      eventId: event.id,
      reminderType: "24h",
    });
  }

  return Response.json({ success: true, count: events.length });
}
```

---

### 2-Hour Reminder Job

**Runs:** Every hour (send to events starting in 2 hours)

```typescript
// Vercel Cron: /api/cron/send-2h-reminders
export async function GET() {
  const in2Hours = new Date();
  in2Hours.setHours(in2Hours.getHours() + 2);

  // Find events starting in ~2 hours
  const events = await findEventsStarting(in2Hours);

  for (const event of events) {
    await sendEventReminder({
      eventId: event.id,
      reminderType: "2h",
    });
  }

  return Response.json({ success: true, count: events.length });
}
```

---

## Testing Emails

### Send Test Email

```typescript
import { sendTestEmail } from "@/lib/email";

const result = await sendTestEmail("your@email.com");

if (result.success) {
  console.log("Test email sent successfully!");
}
```

### Preview Email in Development

```typescript
import { previewEmail } from '@/lib/email/render';
import { RegistrationConfirmationEmail } from '@/lib/email/templates';

const { html, text } = previewEmail(
  <RegistrationConfirmationEmail {...props} />
);

// Save to file or display in browser
await fs.writeFile('preview.html', html);
```

---

## Email Best Practices

### 1. Deliverability

- ✅ Use verified sending domain
- ✅ Include plain text version
- ✅ Avoid spam trigger words
- ✅ Add unsubscribe link (if required)
- ✅ Monitor bounce rates

### 2. Design

- ✅ Mobile-responsive (stacked columns)
- ✅ Inline CSS (email client compatibility)
- ✅ Alt text for images
- ✅ Clear call-to-action buttons
- ✅ Consistent branding

### 3. Performance

- ✅ Queue emails (don't block API)
- ✅ Batch send for large lists
- ✅ Rate limiting (provider limits)
- ✅ Retry failed sends
- ✅ Monitor send stats

### 4. Security

- ✅ Never expose sensitive data in emails
- ✅ Use HTTPS links only
- ✅ Validate recipient addresses
- ✅ Don't send passwords via email
- ✅ Log email activity

---

## Summary

**Unit 8: Email Templates** provides a complete email notification system:

**Files Created (10 files):**

1. `src/lib/email/config.ts` (130 lines) - Configuration
2. `src/lib/email/client.ts` (190 lines) - Multi-provider client
3. `src/lib/email/render.ts` (90 lines) - React to HTML rendering
4. `src/lib/email/helpers.ts` (140 lines) - High-level send functions
5. `src/lib/email/queue.ts` (120 lines) - Background queue
6. `src/lib/email/index.ts` (30 lines) - Barrel export
7. `src/lib/email/templates/base.tsx` (185 lines) - Base layout
8. `src/lib/email/templates/registration-confirmation.tsx` (160 lines)
9. `src/lib/email/templates/event-reminder.tsx` (160 lines)
10. `src/lib/email/templates/event-cancelled.tsx` (130 lines)
11. `src/lib/email/templates/index.ts` (60 lines) - Template exports

**Total Lines of Code:** ~1,395 lines + documentation

**Email Templates:** 3 core templates (registration, reminder, cancelled)

**Providers Supported:** 3 (Resend, SendGrid, NodeMailer/SMTP)

**Key Features:**

- ✅ React-based type-safe templates
- ✅ Multi-provider support
- ✅ HTML and plain text generation
- ✅ Background email queue
- ✅ Bulk sending with retry
- ✅ Helper functions for common scenarios
- ✅ Integration with command layer
- ✅ Scheduled reminder jobs

**Next Steps:**

- Proceed to Unit 9: Testing (Unit tests, integration tests, E2E)
- Then Unit 10: Deployment (Production setup, CI/CD)

This unit completes the notification layer, enabling automated emails for all event lifecycle stages.
