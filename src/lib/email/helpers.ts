/**
 * Email Send Helpers
 * 
 * High-level functions for sending specific email types.
 * Integrates email templates with the email client.
 */

import { sendEmail, EmailPriority } from './client';
import {
  renderRegistrationConfirmation,
  renderEventReminder,
  renderEventCancelled,
} from './templates';
import type { Registration, Event, TicketType, Profile } from '@/types/database.types';

type User = { id: string; email: string };

/**
 * Send registration confirmation email
 */
export async function sendRegistrationConfirmationEmail(
  user: User,
  profile: Profile,
  registration: Registration & { event: Event; ticket_type: TicketType }
) {
  const emailData = renderRegistrationConfirmation({
    userName: profile.full_name,
    eventTitle: registration.event.title,
    eventSlug: registration.event.slug,
    eventStartDate: registration.event.start_date,
    eventEndDate: registration.event.end_date || registration.event.start_date,
    eventLocation: registration.event.location,
    ticketType: registration.ticket_type.name,
    ticketPrice: registration.ticket_type.price,
    registrationId: registration.id,
    confirmationNumber: registration.qr_data.split(':')[1] || registration.id,
  });

  return sendEmail({
    to: user.email!,
    ...emailData,
    priority: EmailPriority.HIGH,
  });
}

/**
 * Send event reminder email (24h or 2h before event)
 */
export async function sendEventReminderEmail(
  user: User,
  profile: Profile,
  registration: Registration & { event: Event; ticket_type: TicketType },
  reminderType: '24h' | '2h'
) {
  const emailData = renderEventReminder({
    userName: profile.full_name,
    eventTitle: registration.event.title,
    eventSlug: registration.event.slug,
    eventStartDate: registration.event.start_date,
    eventEndDate: registration.event.end_date || registration.event.start_date,
    eventLocation: registration.event.location,
    ticketType: registration.ticket_type.name,
    registrationId: registration.id,
    reminderType,
  });

  return sendEmail({
    to: user.email!,
    ...emailData,
    priority: reminderType === '2h' ? EmailPriority.HIGH : EmailPriority.NORMAL,
  });
}

/**
 * Send event cancelled email to all registrants
 */
export async function sendEventCancelledEmail(
  user: User,
  profile: Profile,
  event: Event,
  cancellationReason?: string,
  organizerMessage?: string
) {
  const emailData = renderEventCancelled({
    userName: profile.full_name,
    eventTitle: event.title,
    eventSlug: event.slug,
    eventStartDate: event.start_date,
    eventLocation: event.location,
    cancellationReason,
    organizerMessage,
  });

  return sendEmail({
    to: user.email!,
    ...emailData,
    priority: EmailPriority.HIGH,
  });
}

/**
 * Send event cancelled emails to all attendees (bulk)
 */
export async function notifyEventCancellation(
  event: Event,
  attendees: Array<{ user: User; profile: Profile }>,
  cancellationReason?: string,
  organizerMessage?: string
) {
  const results = await Promise.allSettled(
    attendees.map((attendee) =>
      sendEventCancelledEmail(
        attendee.user,
        attendee.profile,
        event,
        cancellationReason,
        organizerMessage
      )
    )
  );

  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  const failureCount = results.filter((r) => r.status === 'rejected').length;

  return { successCount, failureCount, results };
}

/**
 * Send event reminder to all confirmed attendees (for scheduled job)
 */
export async function sendEventReminders(
  event: Event,
  registrations: Array<
    Registration & { user: User; profile: Profile; ticket_type: TicketType }
  >,
  reminderType: '24h' | '2h'
) {
  const results = await Promise.allSettled(
    registrations.map((registration) =>
      sendEventReminderEmail(
        registration.user,
        registration.profile,
        {
          ...registration,
          event,
        },
        reminderType
      )
    )
  );

  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  const failureCount = results.filter((r) => r.status === 'rejected').length;

  return { successCount, failureCount, results };
}
