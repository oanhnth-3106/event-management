/**
 * Email Queue for Background Processing
 * 
 * Queues emails for background processing to avoid blocking API responses.
 * In production, this should be replaced with a proper job queue (BullMQ, etc.).
 */

import { EmailData, sendEmail } from './client';

/**
 * Email queue entry
 */
interface QueuedEmail extends EmailData {
  id: string;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
}

/**
 * In-memory email queue (replace with Redis/DB in production)
 */
const emailQueue: QueuedEmail[] = [];
let processingInterval: NodeJS.Timeout | null = null;

/**
 * Add email to queue for background sending
 */
export function queueEmail(
  emailData: EmailData,
  options: { maxAttempts?: number } = {}
): string {
  const id = `email_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  const queuedEmail: QueuedEmail = {
    ...emailData,
    id,
    createdAt: new Date(),
    attempts: 0,
    maxAttempts: options.maxAttempts || 3,
  };

  emailQueue.push(queuedEmail);

  // Start processing if not already running
  if (!processingInterval) {
    startQueueProcessor();
  }

  return id;
}

/**
 * Process email queue (run in background)
 */
async function processQueue() {
  if (emailQueue.length === 0) {
    return;
  }

  const email = emailQueue[0]; // FIFO

  try {
    const result = await sendEmail(email);

    if (result.success) {
      // Remove from queue on success
      emailQueue.shift();
    } else {
      // Retry on failure
      email.attempts++;
      email.lastError = result.error;

      if (email.attempts >= email.maxAttempts) {
        // Remove after max attempts
        emailQueue.shift();
      } else {
        // Move to end of queue for retry
        emailQueue.shift();
        emailQueue.push(email);
      }
    }
  } catch (error) {
    email.attempts++;
    email.lastError = error instanceof Error ? error.message : 'Unknown error';

    if (email.attempts >= email.maxAttempts) {
      emailQueue.shift();
    } else {
      emailQueue.shift();
      emailQueue.push(email);
    }
  }
}

/**
 * Start background queue processor
 */
function startQueueProcessor() {
  if (processingInterval) {
    return;
  }

  // Process every 2 seconds
  processingInterval = setInterval(processQueue, 2000);
}

/**
 * Stop background queue processor
 */
export function stopQueueProcessor() {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
}

/**
 * Get queue status (for monitoring)
 */
export function getQueueStatus() {
  return {
    queueLength: emailQueue.length,
    oldestEmail: emailQueue[0]?.createdAt,
    isProcessing: processingInterval !== null,
  };
}

/**
 * Clear all queued emails (for testing/admin)
 */
export function clearQueue() {
  const count = emailQueue.length;
  emailQueue.length = 0;
  return count;
}
