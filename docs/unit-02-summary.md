# Unit 2 Summary: TypeScript Types & Supabase Client Setup

## Overview

This unit establishes the complete type-safe foundation for the Event Management System, providing TypeScript types that mirror the PostgreSQL schema and three Supabase client configurations for different contexts.

## Files Created (14 total)

### TypeScript Types & Business Logic (2 files)

1. **src/types/database.types.ts** (300+ lines)
   - All database table types (Row, Insert, Update)
   - 5 enum types matching PostgreSQL
   - Joined/populated types for complex queries
   - Generic helper types (Row<T>, Insert<T>, Update<T>)
   - Complete Database interface for Supabase client

2. **src/lib/utils.ts** (165 lines)
   - `cn()` - Tailwind CSS class merging
   - `formatCurrency()` - Money formatting with "Free" for $0
   - `formatDate()`, `formatDateTime()` - Locale-aware date formatting
   - `slugify()` - URL-friendly slug generation
   - Event state helpers: `isUpcoming()`, `isPast()`, `isActive()`
   - `getTimeUntilEvent()` - Human-readable countdown
   - `truncate()` - Text truncation with ellipsis

### Supabase Client Configurations (4 files)

3. **src/lib/supabase/server.ts** (165 lines)
   - `createServerClient()` - Server-side client with user session
   - `getCurrentUser()` - Get authenticated user
   - `getCurrentProfile()` - Get user profile with role
   - `requireAuth()` - Require authentication (redirects if not)
   - `requireRole()` - Require specific role (redirects if not)
   - Used in: Server Components, API Routes
   - RLS: **ENFORCED**

4. **src/lib/supabase/client.ts** (39 lines)
   - `createBrowserClient()` - Browser-side client
   - Used in: Client Components ("use client")
   - RLS: **ENFORCED**
   - Auto session refresh

5. **src/lib/supabase/service.ts** (97 lines)
   - `createServiceClient()` - Service role client
   - `executeTransaction()` - RPC wrapper for transactions
   - Used in: Command layer, background jobs
   - RLS: **BYPASSED** (requires manual authorization)
   - ⚠️ Never expose to client

6. **src/middleware.ts** (167 lines)
   - Session refresh on every request
   - Protected route enforcement
   - Role-based access control
   - Automatic redirects (login, unauthorized)
   - Runs on every request (except static files)

### Configuration Files (8 files)

7. **package.json** - All dependencies with exact versions
8. **tsconfig.json** - TypeScript config with strict mode
9. **next.config.js** - Next.js config with Supabase image optimization
10. **tailwind.config.js** - Tailwind CSS with shadcn/ui theme
11. **postcss.config.js** - PostCSS with Tailwind + Autoprefixer
12. **.eslintrc.json** - ESLint config for Next.js
13. **.gitignore** - Git ignore rules
14. **.env.example** - Environment variables template

### Documentation (3 files)

- **README.md** (380 lines) - Complete project documentation
- **SETUP.md** (210 lines) - Step-by-step setup guide
- **IMPLEMENTATION.md** (updated) - Progress tracker

### Styling

- **src/app/globals.css** (60 lines) - Tailwind + shadcn/ui theme variables

## Key Dependencies Installed

### Core Framework

- `next@14.1.0` - Next.js with App Router
- `react@18.2.0` - React 18
- `typescript@5.3.3` - TypeScript 5

### Supabase

- `@supabase/supabase-js@2.39.7` - Supabase client
- `@supabase/ssr@0.1.0` - Supabase SSR helpers

### UI & Styling

- `tailwindcss@3.4.1` - Utility-first CSS
- `@radix-ui/*` - Headless UI components (10 packages)
- `lucide-react@0.344.0` - Icon library
- `class-variance-authority@0.7.0` - Component variants
- `tailwind-merge@2.2.1` - Merge Tailwind classes

### Forms & Validation

- `react-hook-form@7.50.1` - Form state management
- `zod@3.22.4` - Schema validation
- `@hookform/resolvers@3.3.4` - Zod + RHF integration

### QR Codes

- `qrcode.react@3.1.0` - QR code generation (React component)
- `@zxing/browser@0.1.4` - QR code scanning (client-side)
- `@zxing/library@0.20.0` - QR code scanning core

### Email

- `resend@3.2.0` - Email service (recommended)

### Utilities

- `date-fns@3.3.1` - Date manipulation
- `clsx@2.1.0` - Conditional classnames
- `tailwindcss-animate@1.0.7` - Animation utilities

## Type Safety Features

### 1. Database Type Mapping

```typescript
// PostgreSQL → TypeScript
profiles (table) → Profile (interface)
user_role (enum) → UserRole (type)
events (table) → Event (interface)
```

### 2. Type-Safe Operations

```typescript
// Insert: auto-generated fields omitted
const newEvent: EventInsert = {
  organizer_id: userId,
  title: "Tech Conference",
  // id, created_at, updated_at NOT required (auto-generated)
};

// Update: all fields optional
const update: EventUpdate = {
  title: "New Title", // Only updating title
};

// Row: complete database row
const event: Event = {
  id: "...",
  organizer_id: "...",
  title: "...",
  // All fields required
};
```

### 3. Generic Helper Types

```typescript
// Extract types from table name
type EventRow = Row<"events">; // = Event
type EventInsert = Insert<"events">; // = EventInsert
type EventUpdate = Update<"events">; // = EventUpdate

// Autocomplete for table names
const tableName: TableName = "events"; // Autocomplete: events | profiles | ...
```

### 4. Joined Types

```typescript
// Type-safe joins
const eventWithOrganizer: EventWithOrganizer = {
  ...event,
  organizer: {
    id: "...",
    full_name: "...",
    avatar_url: "...",
  },
};
```

## Client Architecture Patterns

### Pattern 1: Server Component (Read-Only)

```typescript
// src/app/events/page.tsx
import { createServerClient } from '@/lib/supabase/server';

async function EventsPage() {
  const supabase = createServerClient();

  // RLS enforced - user can only see published events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'published');

  return <EventList events={events} />;
}
```

### Pattern 2: Client Component (Interactive)

```typescript
// src/components/EventForm.tsx
"use client";

import { createBrowserClient } from '@/lib/supabase/client';

function EventForm() {
  const supabase = createBrowserClient();

  async function handleSubmit() {
    // Call API route instead of direct insert
    await fetch('/api/events', { method: 'POST', body: ... });
  }
}
```

### Pattern 3: Command Layer (Business Logic)

```typescript
// src/lib/commands/createEvent.ts
import { createServiceClient } from "@/lib/supabase/service";

export async function createEvent(input: CreateEventInput) {
  const supabase = createServiceClient();

  // RLS BYPASSED - manual authorization required
  if (!isAuthorized(input.userId, "organizer")) {
    throw new Error("Unauthorized");
  }

  // Business logic with transaction
  const { data } = await supabase.rpc("create_event_transaction", input);
  return data;
}
```

### Pattern 4: API Route (Gateway)

```typescript
// src/app/api/events/route.ts
import { createServerClient } from "@/lib/supabase/server";
import { createEvent } from "@/lib/commands/createEvent";

export async function POST(request: Request) {
  // Get user (RLS enforced)
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Parse input
  const body = await request.json();

  // Invoke command (service role)
  const result = await createEvent({ ...body, userId: user.id });

  return Response.json(result);
}
```

## Environment Variables

### Required Variables

```env
# Supabase (Public - safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase (Secret - NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# QR Security (Secret)
QR_SECRET_KEY=<32-byte-hex-string>

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Email (Optional)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com

# Cron Jobs (Optional)
CRON_SECRET=<32-byte-hex-string>
```

### Security Notes

- ✅ `NEXT_PUBLIC_*` variables are exposed to browser (safe)
- ❌ `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to client
- ❌ `QR_SECRET_KEY` must remain secret (used for HMAC signatures)
- ✅ All secrets should be in `.env.local` (gitignored)
- ✅ Use `.env.example` as template (no real values)

## Middleware Protection

### Protected Routes

```typescript
// Require authentication
const PROTECTED_ROUTES = [
  "/dashboard", // User's tickets
  "/organizer", // Event management
  "/staff", // Check-in interface
  "/profile", // User settings
];

// Role-specific routes
const ROLE_ROUTES = {
  "/organizer": ["organizer", "admin"],
  "/staff": ["staff", "admin"],
};
```

### Automatic Redirects

```typescript
// Unauthenticated user visits /dashboard
→ Redirects to /login?redirect=/dashboard

// Authenticated user visits /login
→ Redirects to /dashboard

// Attendee visits /organizer
→ Redirects to /unauthorized

// User with 'organizer' role visits /organizer
→ Allowed (passes through)
```

## Utility Functions Reference

### Formatting

```typescript
formatCurrency(99.99); // "$99.99"
formatCurrency(0); // "Free"
formatDate("2026-06-15"); // "Jun 15, 2026"
formatDateTime("2026-06-15T09:00:00Z"); // "Jun 15, 2026 at 9:00 AM"
```

### Slug Generation

```typescript
slugify("Tech Conference 2026"); // "tech-conference-2026"
slugify("Hello, World!"); // "hello-world"
```

### Event State Checks

```typescript
isUpcoming("2026-06-15T09:00:00Z"); // true if future
isPast("2026-06-15T17:00:00Z"); // true if past
isActive(startDate, endDate); // true if now between start and end
getTimeUntilEvent(startDate); // "in 4 months"
```

### Text Manipulation

```typescript
truncate("Long description here", 10); // "Long desc..."
```

### Class Merging

```typescript
cn("px-2 py-1", condition && "bg-blue-500", "px-4");
// → "py-1 bg-blue-500 px-4" (px-4 overrides px-2)
```

## Testing Checklist

Before proceeding to Unit 3:

- [ ] `npm install` completes successfully
- [ ] `.env.local` created with all variables
- [ ] Supabase running (local or cloud)
- [ ] Database migration applied
- [ ] `npm run dev` starts without errors
- [ ] `npm run type-check` passes
- [ ] Can access http://localhost:3000
- [ ] Middleware redirects work (try /dashboard without login)

## Next Unit Preview

**Unit 3: Command Layer (CMD-001 to CMD-010)**

We'll implement:

- ✅ CMD-001: CreateEvent
- ✅ CMD-002: ConfigureTicketType
- ✅ CMD-003: PublishEvent
- ✅ CMD-004: RegisterForEvent (with QR generation)
- ✅ CMD-005: GenerateTicketQRCode (HMAC-SHA256 signatures)
- ✅ CMD-006: CheckInTicket (with QR validation)
- ✅ CMD-007: ValidateQRSignature
- ✅ CMD-008: SendEventReminder
- ✅ CMD-009: CancelEvent
- ✅ CMD-010: CancelRegistration

Each command will:

- Validate inputs with Zod schemas
- Enforce business rules and invariants
- Use transactions for atomicity
- Emit domain events
- Return typed results

---

**Status:** ✅ Unit 2 Complete  
**Next:** Unit 3 - Command Layer Implementation  
**Files Created:** 20 total (code + config + docs)  
**Lines of Code:** ~2,000+ lines
