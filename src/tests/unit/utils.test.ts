import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  slugify,
  isUpcoming,
  isPast,
  isActive,
  getTimeUntilEvent,
  truncate,
  cn,
} from '@/lib/utils';

describe('formatCurrency', () => {
  it('should format zero as "Free"', () => {
    expect(formatCurrency(0)).toBe('Free');
  });

  it('should format currency with two decimal places', () => {
    expect(formatCurrency(10.5)).toBe('$10.50');
    expect(formatCurrency(10)).toBe('$10.00');
    expect(formatCurrency(10.99)).toBe('$10.99');
  });

  it('should format large amounts with commas', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  it('should handle negative amounts', () => {
    expect(formatCurrency(-10)).toBe('-$10.00');
  });
});

describe('slugify', () => {
  it('should create URL-friendly slugs', () => {
    expect(slugify('Tech Conference 2026')).toBe('tech-conference-2026');
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('should handle multiple spaces', () => {
    expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
    expect(slugify('  Leading and trailing  ')).toBe('leading-and-trailing');
  });

  it('should remove special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('C++ Workshop')).toBe('c-workshop');
    expect(slugify('React & Node.js')).toBe('react-node-js');
  });

  it('should handle non-ASCII characters', () => {
    expect(slugify('Café Münchën')).toBe('cafe-munchen');
  });

  it('should handle empty strings', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });
});

describe('date utilities', () => {
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
  const now = new Date().toISOString();

  describe('isUpcoming', () => {
    it('should detect upcoming events', () => {
      expect(isUpcoming(futureDate)).toBe(true);
    });

    it('should reject past events', () => {
      expect(isUpcoming(pastDate)).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should detect past events', () => {
      expect(isPast(pastDate)).toBe(true);
    });

    it('should reject future events', () => {
      expect(isPast(futureDate)).toBe(false);
    });
  });

  describe('isActive', () => {
    it('should detect active events (between start and end)', () => {
      const start = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const end = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      expect(isActive(start, end)).toBe(true);
    });

    it('should reject not-yet-started events', () => {
      const start = new Date(Date.now() + 3600000).toISOString();
      const end = new Date(Date.now() + 7200000).toISOString();
      expect(isActive(start, end)).toBe(false);
    });

    it('should reject already-ended events', () => {
      const start = new Date(Date.now() - 7200000).toISOString();
      const end = new Date(Date.now() - 3600000).toISOString();
      expect(isActive(start, end)).toBe(false);
    });
  });

  describe('getTimeUntilEvent', () => {
    it('should calculate time until event', () => {
      const in2Hours = new Date(Date.now() + 7200000).toISOString();
      const timeUntil = getTimeUntilEvent(in2Hours);
      expect(timeUntil).toContain('hour');
    });

    it('should handle events starting soon', () => {
      const in30Min = new Date(Date.now() + 1800000).toISOString();
      const timeUntil = getTimeUntilEvent(in30Min);
      expect(timeUntil).toContain('minute');
    });

    it('should handle past events', () => {
      const past = new Date(Date.now() - 3600000).toISOString();
      const timeUntil = getTimeUntilEvent(past);
      expect(timeUntil).toBe('Event has started');
    });
  });

  describe('formatDate', () => {
    it('should format date without time', () => {
      const date = new Date('2026-03-15T14:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toContain('Mar');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2026');
    });
  });

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const date = new Date('2026-03-15T14:30:00Z');
      const formatted = formatDateTime(date);
      expect(formatted).toContain('Mar');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2026');
    });
  });
});

describe('truncate', () => {
  it('should truncate long text', () => {
    const long = 'This is a very long text that should be truncated';
    expect(truncate(long, 20)).toBe('This is a very long...');
  });

  it('should not truncate short text', () => {
    const short = 'Short text';
    expect(truncate(short, 20)).toBe('Short text');
  });

  it('should handle exact length', () => {
    const exact = 'Exactly twenty chars';
    expect(truncate(exact, 20)).toBe('Exactly twenty chars');
  });
});

describe('cn (className utility)', () => {
  it('should merge class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
  });

  it('should handle undefined and null', () => {
    expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
  });
});
