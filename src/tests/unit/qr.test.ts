import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSignature,
  generateQRData,
  parseQRData,
  validateQRSignature,
  isQRTimestampValid,
  validateQRCode,
} from '@/lib/qr';

describe('QR Code Security', () => {
  const eventId = 'event-123';
  const registrationId = 'reg-456';
  let qrData: string;
  let timestamp: string;

  beforeEach(() => {
    timestamp = new Date().toISOString();
    qrData = generateQRData(eventId, registrationId, timestamp);
  });

  describe('generateQRData', () => {
    it('should generate QR data with correct format', () => {
      expect(qrData).toContain(eventId);
      expect(qrData).toContain(registrationId);
      
      const parts = qrData.split(':');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe(eventId);
      expect(parts[1]).toBe(registrationId);
      expect(parts[2]).toBe(timestamp);
      expect(parts[3]).toBeTruthy(); // signature
    });

    it('should generate different signatures for different data', () => {
      const qr1 = generateQRData('6c4c3f54-8f36-4d8e-9a6b-1234567890ab', '7d5d4f65-9f47-5e9f-0b7c-2345678901bc');
      const qr2 = generateQRData('8e6e5f76-0f58-6f0f-1c8d-3456789012cd', '9f7f6f87-1f69-7f1f-2d9e-4567890123de');
      
      expect(qr1).not.toBe(qr2);
    });

    it('should include timestamp', () => {
      const ts = new Date().toISOString();
      const result = generateQRData(eventId, registrationId, ts);
      expect(result).toContain(ts);
    });
  });

  describe('parseQRData', () => {
    it('should parse QR data correctly', () => {
      const parsed = parseQRData(qrData);
      
      expect(parsed).toEqual({
        eventId,
        registrationId,
        timestamp,
        signature: expect.any(String),
      });
    });

    it('should return null for invalid format', () => {
      expect(parseQRData('invalid')).toBeNull();
      expect(parseQRData('only:two:parts')).toBeNull();
      expect(parseQRData('')).toBeNull();
    });

    it('should return null for non-numeric timestamp', () => {
      const invalidQR = `${eventId}:${registrationId}:notanumber:signature`;
      expect(parseQRData(invalidQR)).toBeNull();
    });
  });

  describe('validateQRSignature', () => {
    it('should validate correct signature', () => {
      const isValid = validateQRSignature(qrData);
      expect(isValid).toBe(true);
    });

    it('should reject tampered event ID', () => {
      const tampered = qrData.replace(eventId, 'hacked-event');
      const isValid = validateQRSignature(tampered);
      expect(isValid).toBe(false);
    });

    it('should reject tampered registration ID', () => {
      const tampered = qrData.replace(registrationId, 'hacked-reg');
      const isValid = validateQRSignature(tampered);
      expect(isValid).toBe(false);
    });

    it('should reject tampered timestamp', () => {
      const parts = qrData.split(':');
      parts[2] = (parseInt(parts[2]) + 1000).toString();
      const tampered = parts.join(':');
      const isValid = validateQRSignature(tampered);
      expect(isValid).toBe(false);
    });

    it('should reject tampered signature', () => {
      const parts = qrData.split(':');
      parts[3] = 'hacked-signature';
      const tampered = parts.join(':');
      const isValid = validateQRSignature(tampered);
      expect(isValid).toBe(false);
    });

    it('should reject invalid format', () => {
      expect(validateQRSignature('invalid')).toBe(false);
      expect(validateQRSignature('')).toBe(false);
    });
  });

  describe('isQRTimestampValid', () => {
    it('should validate timestamp within 2-hour window before event', () => {
      const eventStart = new Date().toISOString();
      const eventEnd = new Date(Date.now() + 3600000).toISOString();
      expect(isQRTimestampValid(eventStart, eventEnd)).toBe(true);
    });

    it('should validate timestamp within 2-hour window after event start', () => {
      const eventStart = new Date(Date.now() - 3600000).toISOString();
      const eventEnd = new Date().toISOString();
      expect(isQRTimestampValid(eventStart, eventEnd)).toBe(true);
    });

    it('should reject timestamp more than 2 hours before event', () => {
      const eventStart = new Date(Date.now() + 7200001).toISOString();
      const eventEnd = new Date(Date.now() + 10800000).toISOString();
      expect(isQRTimestampValid(eventStart, eventEnd)).toBe(false);
    });

    it('should reject timestamp more than 2 hours after event', () => {
      const eventStart = new Date(Date.now() - 10800000).toISOString();
      const eventEnd = new Date(Date.now() - 7200001).toISOString();
      expect(isQRTimestampValid(eventStart, eventEnd)).toBe(false);
    });

    it('should validate current timestamp', () => {
      const now = new Date().toISOString();
      const later = new Date(Date.now() + 3600000).toISOString();
      expect(isQRTimestampValid(now, later)).toBe(true);
    });
  });

  describe('validateQRCode', () => {
    it('should validate complete QR code', () => {
      const eventStart = new Date().toISOString();
      const eventEnd = new Date(Date.now() + 3600000).toISOString();
      const result = validateQRCode(qrData, eventStart, eventEnd);
      
      expect(result.isValid).toBe(true);
      expect(result.parsed?.eventId).toBe(eventId);
      expect(result.parsed?.registrationId).toBe(registrationId);
      expect(result.parsed?.timestamp).toBe(timestamp);
      expect(result.reason).toBeUndefined();
    });

    it('should reject QR code with invalid signature', () => {
      const eventStart = new Date().toISOString();
      const eventEnd = new Date(Date.now() + 3600000).toISOString();
      const tampered = qrData.replace(eventId, '1234567890abcdef');
      const result = validateQRCode(tampered, eventStart, eventEnd);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('signature');
    });

    it('should reject QR code with expired timestamp', () => {
      const eventStart = new Date(Date.now() - 10800000).toISOString();
      const eventEnd = new Date(Date.now() - 7200001).toISOString();
      const result = validateQRCode(qrData, eventStart, eventEnd);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBeTruthy();
    });

    it('should reject QR code with invalid format', () => {
      const eventStart = new Date().toISOString();
      const eventEnd = new Date(Date.now() + 3600000).toISOString();
      const result = validateQRCode('invalid-qr-format', eventStart, eventEnd);
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('format');
    });
  });

  describe('generateSignature', () => {
    it('should generate consistent signatures for same input', () => {
      const payload = `${eventId}:${registrationId}:${timestamp}`;
      const sig1 = generateSignature(payload);
      const sig2 = generateSignature(payload);
      
      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different inputs', () => {
      const sig1 = generateSignature('event-1:reg-1:2026-02-06T12:00:00.000Z');
      const sig2 = generateSignature('event-2:reg-2:2026-02-06T12:00:00.000Z');
      
      expect(sig1).not.toBe(sig2);
    });

    it('should be deterministic', () => {
      const payload = `${eventId}:${registrationId}:${timestamp}`;
      const signatures = Array.from({ length: 10 }, () =>
        generateSignature(payload)
      );
      
      expect(new Set(signatures).size).toBe(1); // All the same
    });
  });
});
