// =====================================================================
// QR Code Utilities - Generation and validation with HMAC signatures
// =====================================================================
// Security: HMAC-SHA256 for cryptographic integrity
// Format: eventId:registrationId:timestamp:signature
// =====================================================================

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * QR code data structure after parsing
 */
export interface ParsedQRData {
  eventId: string;
  registrationId: string;
  timestamp: string;
  signature: string;
}

/**
 * Get QR secret key from environment
 * @throws Error if QR_SECRET_KEY not set
 */
function getQRSecretKey(): string {
  const secret = process.env.QR_SECRET_KEY;
  
  if (!secret) {
    throw new Error(
      'QR_SECRET_KEY environment variable is not set. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }
  
  return secret;
}

/**
 * Generate HMAC-SHA256 signature for QR code data
 * 
 * @param data - Data to sign (eventId:registrationId:timestamp)
 * @returns Hex-encoded signature
 * 
 * @example
 * const signature = generateSignature('event123:reg456:2026-02-06T12:00:00Z');
 */
export function generateSignature(data: string): string {
  const secret = getQRSecretKey();
  const hmac = createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Generate complete QR code data with signature
 * 
 * @param eventId - Event UUID
 * @param registrationId - Registration UUID
 * @param timestamp - ISO 8601 timestamp (defaults to now)
 * @returns Complete QR code string
 * 
 * @example
 * const qrData = generateQRData('event-id', 'reg-id');
 * // => 'event-id:reg-id:2026-02-06T12:00:00.000Z:abc123...'
 */
export function generateQRData(
  eventId: string,
  registrationId: string,
  timestamp: string = new Date().toISOString()
): string {
  // Format: eventId:registrationId:timestamp
  const payload = `${eventId}:${registrationId}:${timestamp}`;
  
  // Generate signature
  const signature = generateSignature(payload);
  
  // Complete QR data: payload:signature
  return `${payload}:${signature}`;
}

/**
 * Parse QR code data string
 * 
 * @param qrData - Raw QR code string
 * @returns Parsed components or null if malformed
 * 
 * @example
 * const parsed = parseQRData('event:reg:2026-02-06T12:00:00Z:sig');
 * // => { eventId: 'event', registrationId: 'reg', ... }
 */
export function parseQRData(qrData: string): ParsedQRData | null {
  const parts = qrData.split(':');
  
  // Format: eventId:registrationId:timestamp:signature
  if (parts.length !== 4) {
    return null;
  }
  
  const [eventId, registrationId, timestamp, signature] = parts;
  
  // Validate UUIDs format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(eventId) || !uuidRegex.test(registrationId)) {
    return null;
  }
  
  // Validate timestamp format (ISO 8601)
  if (isNaN(new Date(timestamp).getTime())) {
    return null;
  }
  
  // Validate signature format (hex string)
  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    return null;
  }
  
  return {
    eventId,
    registrationId,
    timestamp,
    signature,
  };
}

/**
 * Validate QR code signature using constant-time comparison
 * 
 * @param qrData - Raw QR code string
 * @returns True if signature is valid
 * 
 * @example
 * const isValid = validateQRSignature(scannedData);
 * if (!isValid) {
 *   throw new Error('Invalid QR code');
 * }
 */
export function validateQRSignature(qrData: string): boolean {
  // Parse QR data
  const parsed = parseQRData(qrData);
  if (!parsed) {
    return false;
  }
  
  const { eventId, registrationId, timestamp, signature } = parsed;
  
  // Reconstruct payload
  const payload = `${eventId}:${registrationId}:${timestamp}`;
  
  // Generate expected signature
  const expectedSignature = generateSignature(payload);
  
  // Constant-time comparison to prevent timing attacks
  try {
    const providedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    // Both buffers must be same length
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (error) {
    // Buffer creation failed (invalid hex)
    return false;
  }
}

/**
 * Check if QR code timestamp is within valid window
 * 
 * QR codes are valid:
 * - 2 hours before event start (early check-in)
 * - Until 2 hours after event end (late check-in)
 * 
 * @param eventStartDate - Event start date (ISO 8601)
 * @param eventEndDate - Event end date (ISO 8601)
 * @param qrTimestamp - QR code timestamp (ISO 8601)
 * @returns True if within valid window
 */
export function isQRTimestampValid(
  eventStartDate: string,
  eventEndDate: string,
  qrTimestamp?: string
): boolean {
  const now = new Date();
  const start = new Date(eventStartDate);
  const end = new Date(eventEndDate);
  
  // QR code timestamp is optional (only matters if we want to expire old QR codes)
  // For this MVP, we don't expire QR codes based on generation time
  // We only check if check-in is within event window
  
  // Check-in window: 2 hours before start to 2 hours after end
  const checkInWindowStart = new Date(start.getTime() - 2 * 60 * 60 * 1000);
  const checkInWindowEnd = new Date(end.getTime() + 2 * 60 * 60 * 1000);
  
  return now >= checkInWindowStart && now <= checkInWindowEnd;
}

/**
 * Validate complete QR code (signature + timestamp)
 * 
 * @param qrData - Raw QR code string
 * @param eventStartDate - Event start date
 * @param eventEndDate - Event end date
 * @returns Validation result with parsed data
 * 
 * @example
 * const result = validateQRCode(scannedData, event.start_date, event.end_date);
 * if (!result.isValid) {
 *   throw new Error(result.reason);
 * }
 */
export function validateQRCode(
  qrData: string,
  eventStartDate: string,
  eventEndDate: string
): {
  isValid: boolean;
  reason?: string;
  parsed?: ParsedQRData;
} {
  // Parse QR data
  const parsed = parseQRData(qrData);
  if (!parsed) {
    return {
      isValid: false,
      reason: 'QR code format is invalid',
    };
  }
  
  // Validate signature
  if (!validateQRSignature(qrData)) {
    return {
      isValid: false,
      reason: 'QR code signature is invalid',
      parsed,
    };
  }
  
  // Validate timestamp (check-in window)
  if (!isQRTimestampValid(eventStartDate, eventEndDate, parsed.timestamp)) {
    const now = new Date();
    const start = new Date(eventStartDate);
    const end = new Date(eventEndDate);
    
    if (now < new Date(start.getTime() - 2 * 60 * 60 * 1000)) {
      return {
        isValid: false,
        reason: 'Event check-in has not opened yet (opens 2 hours before start)',
        parsed,
      };
    } else {
      return {
        isValid: false,
        reason: 'Event check-in has closed (closes 2 hours after end)',
        parsed,
      };
    }
  }
  
  return {
    isValid: true,
    parsed,
  };
}

/**
 * Alias for validateQRSignature for API compatibility
 */
export function verifyQRSignature(qrData: any): boolean {
  if (typeof qrData === 'string') {
    return validateQRSignature(qrData);
  }
  
  // If qrData is an object with signature field
  if (qrData && typeof qrData === 'object' && qrData.signature) {
    const payload = `${qrData.eventId}:${qrData.registrationId}:${qrData.timestamp || ''}`;
    const expectedSignature = generateSignature(payload);
    
    try {
      const providedBuffer = Buffer.from(qrData.signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      
      if (providedBuffer.length !== expectedBuffer.length) {
        return false;
      }
      
      return timingSafeEqual(providedBuffer, expectedBuffer);
    } catch (error) {
      return false;
    }
  }
  
  return false;
}
