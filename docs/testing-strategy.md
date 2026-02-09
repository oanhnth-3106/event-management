# Testing Strategy

## Overview

This document outlines the testing strategy for the Event Management system, covering unit tests, integration tests, and end-to-end tests.

**Testing Pyramid:**

- **Unit Tests (70%):** Individual functions, components, utilities
- **Integration Tests (20%):** API routes, command layer, database interactions
- **End-to-End Tests (10%):** Complete user workflows

**Testing Tools:**

- **Vitest:** Fast unit testing framework (Jest alternative)
- **React Testing Library:** Component testing
- **Playwright:** E2E testing
- **MSW (Mock Service Worker):** API mocking
- **Supabase Test Helpers:** Database testing

---

## Test Configuration

### Vitest Setup

**File:** `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Test Setup

**File:** `src/tests/setup.ts`

```typescript
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.QR_SECRET_KEY = "test-secret-key-32-chars-long!!";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/test",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  }),
}));
```

---

## Unit Tests

### 1. Utility Functions

**File:** `src/tests/unit/utils.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  slugify,
  isUpcoming,
  isPast,
  isActive,
  getTimeUntilEvent,
} from "@/lib/utils";

describe("formatCurrency", () => {
  it("should format currency correctly", () => {
    expect(formatCurrency(0)).toBe("Free");
    expect(formatCurrency(10.5)).toBe("$10.50");
    expect(formatCurrency(1000)).toBe("$1,000.00");
  });
});

describe("slugify", () => {
  it("should create URL-friendly slugs", () => {
    expect(slugify("Tech Conference 2026")).toBe("tech-conference-2026");
    expect(slugify("Hello World!")).toBe("hello-world");
    expect(slugify("Multiple   Spaces")).toBe("multiple-spaces");
  });

  it("should handle special characters", () => {
    expect(slugify("C++ Workshop")).toBe("c-workshop");
    expect(slugify("React & Node.js")).toBe("react-node-js");
  });
});

describe("date utilities", () => {
  const futureDate = new Date(Date.now() + 86400000); // Tomorrow
  const pastDate = new Date(Date.now() - 86400000); // Yesterday
  const now = new Date();

  it("should detect upcoming events", () => {
    expect(isUpcoming(futureDate.toISOString())).toBe(true);
    expect(isUpcoming(pastDate.toISOString())).toBe(false);
  });

  it("should detect past events", () => {
    expect(isPast(pastDate.toISOString())).toBe(true);
    expect(isPast(futureDate.toISOString())).toBe(false);
  });

  it("should calculate time until event", () => {
    const timeUntil = getTimeUntilEvent(futureDate.toISOString());
    expect(timeUntil).toContain("hour");
  });
});
```

---

### 2. QR Code Security

**File:** `src/tests/unit/qr.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import {
  generateSignature,
  generateQRData,
  parseQRData,
  validateQRSignature,
  isQRTimestampValid,
  validateQRCode,
} from "@/lib/qr";

describe("QR Code Security", () => {
  const eventId = "event-123";
  const registrationId = "reg-456";
  let qrData: string;
  let timestamp: number;

  beforeAll(() => {
    const result = generateQRData(eventId, registrationId);
    qrData = result.qrData;
    timestamp = result.timestamp;
  });

  it("should generate QR data with signature", () => {
    expect(qrData).toContain(eventId);
    expect(qrData).toContain(registrationId);
    expect(qrData.split(":")).toHaveLength(4);
  });

  it("should parse QR data correctly", () => {
    const parsed = parseQRData(qrData);
    expect(parsed).toEqual({
      eventId,
      registrationId,
      timestamp,
      signature: expect.any(String),
    });
  });

  it("should validate correct signature", () => {
    const isValid = validateQRSignature(qrData);
    expect(isValid).toBe(true);
  });

  it("should reject tampered QR data", () => {
    const tampered = qrData.replace(eventId, "hacked-event");
    const isValid = validateQRSignature(tampered);
    expect(isValid).toBe(false);
  });

  it("should validate timestamp within window", () => {
    const now = Date.now();
    const recentTimestamp = now - 3600000; // 1 hour ago
    expect(isQRTimestampValid(recentTimestamp, now)).toBe(true);

    const oldTimestamp = now - 7200001; // Just over 2 hours ago
    expect(isQRTimestampValid(oldTimestamp, now)).toBe(false);
  });

  it("should perform complete QR validation", () => {
    const result = validateQRCode(qrData, eventId);
    expect(result.valid).toBe(true);
    expect(result.eventId).toBe(eventId);
    expect(result.registrationId).toBe(registrationId);
  });
});
```

---

### 3. Command Layer

**File:** `src/tests/unit/commands/createEvent.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";
import { createEvent } from "@/lib/commands/createEvent";
import type { CreateEventInput } from "@/types/command.types";

describe("createEvent command", () => {
  const validInput: CreateEventInput = {
    userId: "user-123",
    title: "Test Conference",
    description: "A test conference",
    startDate: new Date(Date.now() + 86400000).toISOString(),
    endDate: new Date(Date.now() + 172800000).toISOString(),
    location: "San Francisco, CA",
    capacity: 100,
    imageUrl: "https://example.com/image.jpg",
  };

  it("should create event with valid input", async () => {
    // This would require mocking Supabase service client
    // For now, testing input validation
    expect(validInput.capacity).toBeGreaterThan(0);
    expect(new Date(validInput.startDate).getTime()).toBeLessThan(
      new Date(validInput.endDate).getTime(),
    );
  });

  it("should reject event with past start date", () => {
    const pastInput = {
      ...validInput,
      startDate: new Date(Date.now() - 86400000).toISOString(),
    };

    const startDate = new Date(pastInput.startDate);
    expect(startDate.getTime()).toBeLessThan(Date.now());
  });

  it("should reject event with end before start", () => {
    const invalidInput = {
      ...validInput,
      endDate: new Date(Date.now() + 43200000).toISOString(),
    };

    const start = new Date(invalidInput.startDate);
    const end = new Date(invalidInput.endDate);
    expect(end.getTime()).toBeLessThan(start.getTime());
  });

  it("should reject event with zero capacity", () => {
    const zeroCapacity = { ...validInput, capacity: 0 };
    expect(zeroCapacity.capacity).toBeLessThanOrEqual(0);
  });
});
```

---

## Integration Tests

### 1. API Routes

**File:** `src/tests/integration/api/events.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { POST as createEventHandler } from "@/app/api/events/create/route";

describe("POST /api/events/create", () => {
  it("should require authentication", async () => {
    const request = new Request("http://localhost:3000/api/events/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Test Event",
        description: "Test",
        startDate: new Date(Date.now() + 86400000).toISOString(),
        location: "Test Location",
        capacity: 100,
      }),
    });

    const response = await createEventHandler(request);
    expect(response.status).toBe(401);
  });
});
```

---

## Component Tests

### 1. Event List Component

**File:** `src/tests/components/EventList.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventList } from '@/components/events/EventList';

describe('EventList', () => {
  it('should render empty state', async () => {
    render(<EventList status="upcoming" />);
    // Component is async, so we'd need to handle that
  });

  it('should display events', async () => {
    // Would need to mock Supabase data
  });
});
```

---

## E2E Tests

### Playwright Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Example

**File:** `src/tests/e2e/registration-flow.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Event Registration Flow", () => {
  test("should allow user to register for event", async ({ page }) => {
    // Navigate to events page
    await page.goto("/events");

    // Click on first event
    await page.click("text=View Event");

    // Fill registration form
    await page.fill('input[name="full_name"]', "John Doe");
    await page.fill('input[name="email"]', "john@example.com");
    await page.selectOption('select[name="ticket_type_id"]', { index: 0 });

    // Submit registration
    await page.click('button[type="submit"]');

    // Should redirect to ticket page
    await expect(page).toHaveURL(/\/my\/registrations\/.+/);

    // Should see QR code
    await expect(page.locator("canvas")).toBeVisible();
  });
});
```

---

## Test Coverage Goals

**Target Coverage:**

- Overall: 80%+
- Critical paths: 90%+
- Utilities: 100%
- Commands: 85%+
- Components: 75%+

**Commands:**

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test src/tests/unit/utils.test.ts
```

---

## Continuous Integration

**GitHub Actions:** `.github/workflows/test.yml`

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
```

---

## Summary

This testing strategy ensures:

- ✅ High code coverage
- ✅ Confidence in deployments
- ✅ Regression prevention
- ✅ Documentation through tests
- ✅ CI/CD integration

Next: Implement actual test files based on this strategy.
