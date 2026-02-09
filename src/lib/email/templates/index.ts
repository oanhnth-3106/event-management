/**
 * Email Templates Index
 * 
 * Central export for all email templates with type-safe rendering functions.
 */

import * as React from 'react';
import { renderEmailTemplate, htmlToText } from '../render';
import { EmailData } from '../client';
import { EmailType } from '../config';

// Import template components
import {
  RegistrationConfirmationEmail,
  RegistrationConfirmationEmailProps,
} from './registration-confirmation';
import { EventReminderEmail, EventReminderEmailProps } from './event-reminder';
import { EventCancelledEmail, EventCancelledEmailProps } from './event-cancelled';

/**
 * Render registration confirmation email
 */
export function renderRegistrationConfirmation(
  props: RegistrationConfirmationEmailProps
): Pick<EmailData, 'subject' | 'html' | 'text' | 'type'> {
  const component = React.createElement(RegistrationConfirmationEmail, props);
  const html = renderEmailTemplate(component);
  const text = htmlToText(html);

  return {
    subject: `Registration Confirmed: ${props.eventTitle}`,
    html,
    text,
    type: EmailType.REGISTRATION_CONFIRMATION,
  };
}

/**
 * Render event reminder email
 */
export function renderEventReminder(
  props: EventReminderEmailProps
): Pick<EmailData, 'subject' | 'html' | 'text' | 'type'> {
  const component = React.createElement(EventReminderEmail, props);
  const html = renderEmailTemplate(component);
  const text = htmlToText(html);

  const reminderText = props.reminderType === '24h' ? '24 hours' : '2 hours';
  const type =
    props.reminderType === '24h'
      ? EmailType.EVENT_REMINDER_24H
      : EmailType.EVENT_REMINDER_2H;

  return {
    subject: `Reminder: ${props.eventTitle} in ${reminderText}`,
    html,
    text,
    type,
  };
}

/**
 * Render event cancelled email
 */
export function renderEventCancelled(
  props: EventCancelledEmailProps
): Pick<EmailData, 'subject' | 'html' | 'text' | 'type'> {
  const component = React.createElement(EventCancelledEmail, props);
  const html = renderEmailTemplate(component);
  const text = htmlToText(html);

  return {
    subject: `Event Cancelled: ${props.eventTitle}`,
    html,
    text,
    type: EmailType.EVENT_CANCELLED,
  };
}

// Export template props for use in other modules
export type {
  RegistrationConfirmationEmailProps,
  EventReminderEmailProps,
  EventCancelledEmailProps,
};
