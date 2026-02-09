/**
 * Email Module Barrel Export
 * 
 * Main entry point for email functionality.
 */

// Configuration
export {
  EMAIL_CONFIG,
  EmailType,
  EmailPriority,
  getFromAddress,
  buildEmailUrl,
  validateEmailConfig,
} from './config';

// Client
export type { EmailData, EmailAttachment, EmailResult } from './client';
export { sendEmail, sendBulkEmails, sendTestEmail } from './client';

// Templates
export {
  renderRegistrationConfirmation,
  renderEventReminder,
  renderEventCancelled,
} from './templates';

export type {
  RegistrationConfirmationEmailProps,
  EventReminderEmailProps,
  EventCancelledEmailProps,
} from './templates';

// Rendering utilities
export { renderEmailTemplate, htmlToText, previewEmail } from './render';
