/**
 * Email Configuration
 * 
 * Centralized email settings for the application.
 * Supports multiple email providers (Resend, SendGrid, NodeMailer).
 */

export const EMAIL_CONFIG = {
  // Email provider (resend, sendgrid, nodemailer)
  provider: (process.env.EMAIL_PROVIDER || 'resend') as 'resend' | 'sendgrid' | 'nodemailer',

  // From address (verified domain required for production)
  from: {
    email: process.env.EMAIL_FROM || 'noreply@eventhub.com',
    name: process.env.EMAIL_FROM_NAME || 'EventHub',
  },

  // Support email for user inquiries
  support: process.env.EMAIL_SUPPORT || 'support@eventhub.com',

  // API keys (provider-specific)
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
  },
  nodemailer: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },

  // Base URL for links in emails
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Default settings
  defaults: {
    replyTo: process.env.EMAIL_REPLY_TO,
  },
} as const;

/**
 * Email types for tracking and categorization
 */
export enum EmailType {
  // Registration emails
  REGISTRATION_CONFIRMATION = 'registration_confirmation',
  REGISTRATION_CANCELLED = 'registration_cancelled',

  // Event reminders
  EVENT_REMINDER_24H = 'event_reminder_24h',
  EVENT_REMINDER_2H = 'event_reminder_2h',

  // Event updates
  EVENT_PUBLISHED = 'event_published',
  EVENT_UPDATED = 'event_updated',
  EVENT_CANCELLED = 'event_cancelled',

  // Check-in confirmations
  CHECK_IN_CONFIRMATION = 'check_in_confirmation',

  // Organizer notifications
  NEW_REGISTRATION = 'new_registration',
  EVENT_CAPACITY_WARNING = 'event_capacity_warning',

  // Staff notifications
  STAFF_ASSIGNMENT = 'staff_assignment',

  // Admin notifications
  ADMIN_ALERT = 'admin_alert',
}

/**
 * Email priority levels
 */
export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Get the formatted "from" address
 */
export function getFromAddress(): string {
  return `${EMAIL_CONFIG.from.name} <${EMAIL_CONFIG.from.email}>`;
}

/**
 * Build absolute URL for email links
 */
export function buildEmailUrl(path: string): string {
  const baseUrl = EMAIL_CONFIG.appUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!EMAIL_CONFIG.from.email) {
    errors.push('EMAIL_FROM is required');
  }

  switch (EMAIL_CONFIG.provider) {
    case 'resend':
      if (!EMAIL_CONFIG.resend.apiKey) {
        errors.push('RESEND_API_KEY is required for Resend provider');
      }
      break;
    case 'sendgrid':
      if (!EMAIL_CONFIG.sendgrid.apiKey) {
        errors.push('SENDGRID_API_KEY is required for SendGrid provider');
      }
      break;
    case 'nodemailer':
      if (!EMAIL_CONFIG.nodemailer.auth.user || !EMAIL_CONFIG.nodemailer.auth.pass) {
        errors.push('SMTP_USER and SMTP_PASS are required for NodeMailer provider');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
