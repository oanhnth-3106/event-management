/**
 * Email Client
 * 
 * Unified interface for sending emails across different providers.
 * Supports Resend (recommended), SendGrid, and NodeMailer (SMTP).
 */

import { EMAIL_CONFIG, EmailType, EmailPriority } from './config';

/**
 * Email data structure
 */
export interface EmailData {
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

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

/**
 * Email send result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Export EmailPriority for use in other modules
 */
export { EmailPriority } from './config';

/**
 * Send email using configured provider
 */
export async function sendEmail(data: EmailData): Promise<EmailResult> {
  try {
    switch (EMAIL_CONFIG.provider) {
      case 'resend':
        return await sendViaResend(data);
      case 'sendgrid':
        return await sendViaSendGrid(data);
      case 'nodemailer':
        return await sendViaNodeMailer(data);
      default:
        throw new Error(`Unsupported email provider: ${EMAIL_CONFIG.provider}`);
    }
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send email via Resend (recommended for production)
 */
async function sendViaResend(data: EmailData): Promise<EmailResult> {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(EMAIL_CONFIG.resend.apiKey);

    const result = await resend.emails.send({
      from: `${EMAIL_CONFIG.from.name} <${EMAIL_CONFIG.from.email}>`,
      to: Array.isArray(data.to) ? data.to : [data.to],
      subject: data.subject,
      html: data.html,
      text: data.text,
      reply_to: data.replyTo || EMAIL_CONFIG.defaults.replyTo,
      cc: data.cc,
      bcc: data.bcc,
      attachments: data.attachments,
    });

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Resend error',
    };
  }
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(data: EmailData): Promise<EmailResult> {
  try {
    // @ts-ignore - Optional dependency
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(EMAIL_CONFIG.sendgrid.apiKey);

    const msg = {
      to: data.to,
      from: {
        email: EMAIL_CONFIG.from.email,
        name: EMAIL_CONFIG.from.name,
      },
      subject: data.subject,
      html: data.html,
      text: data.text,
      replyTo: data.replyTo || EMAIL_CONFIG.defaults.replyTo,
      cc: data.cc,
      bcc: data.bcc,
      attachments: data.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content.toString('base64'),
        type: att.contentType,
        disposition: 'attachment',
      })),
    };

    const result = await sgMail.default.send(msg);

    return {
      success: true,
      messageId: result[0]?.headers['x-message-id'] as string,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'SendGrid error',
    };
  }
}

/**
 * Send email via NodeMailer (SMTP)
 */
async function sendViaNodeMailer(data: EmailData): Promise<EmailResult> {
  try {
    // @ts-ignore - Optional dependency
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host: EMAIL_CONFIG.nodemailer.host,
      port: EMAIL_CONFIG.nodemailer.port,
      secure: EMAIL_CONFIG.nodemailer.secure,
      auth: EMAIL_CONFIG.nodemailer.auth,
    });

    const result = await transporter.sendMail({
      from: `${EMAIL_CONFIG.from.name} <${EMAIL_CONFIG.from.email}>`,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
      replyTo: data.replyTo || EMAIL_CONFIG.defaults.replyTo,
      cc: data.cc,
      bcc: data.bcc,
      attachments: data.attachments,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'NodeMailer error',
    };
  }
}

/**
 * Send bulk emails (with rate limiting)
 */
export async function sendBulkEmails(
  emails: EmailData[],
  options: {
    batchSize?: number;
    delayMs?: number;
  } = {}
): Promise<EmailResult[]> {
  const { batchSize = 10, delayMs = 100 } = options;
  const results: EmailResult[] = [];

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(sendEmail));
    results.push(...batchResults);

    // Delay between batches to avoid rate limits
    if (i + batchSize < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Test email configuration by sending a test email
 */
export async function sendTestEmail(to: string): Promise<EmailResult> {
  return sendEmail({
    to,
    subject: 'EventHub Email Test',
    html: `
      <h1>Email Configuration Test</h1>
      <p>This is a test email from EventHub.</p>
      <p>If you received this, your email configuration is working correctly!</p>
      <p><strong>Provider:</strong> ${EMAIL_CONFIG.provider}</p>
      <p><strong>From:</strong> ${EMAIL_CONFIG.from.email}</p>
    `,
    text: 'EventHub email configuration test',
    type: EmailType.ADMIN_ALERT,
  });
}
