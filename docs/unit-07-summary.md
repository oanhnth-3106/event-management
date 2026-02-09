# Unit 7: Page Routes (Next.js App Router)

## Overview

This unit implements the complete set of Next.js 14 App Router pages, providing the user-facing interface for all features of the Event Management system. All pages integrate with the components (Unit 5), authentication system (Unit 6), and API routes (Unit 4).

**Key Technologies:**

- Next.js 14 App Router
- Server Components (default)
- Client Components (where needed)
- Server-side authentication
- Dynamic routes with parameters
- Search params for filtering

---

## Architecture

### Page Structure

```
src/app/
├── page.tsx                              # Home page (public)
├── events/
│   ├── page.tsx                          # Browse events (public)
│   └── [slug]/
│       └── page.tsx                      # Event detail (public/auth)
├── my/
│   └── registrations/
│       ├── page.tsx                      # My tickets (auth required)
│       └── [id]/
│           └── page.tsx                  # Ticket detail with QR (auth required)
├── organizer/
│   ├── create/
│   │   └── page.tsx                      # Create event (organizer only)
│   └── events/
│       ├── page.tsx                      # My events (organizer only)
│       └── [id]/
│           └── page.tsx                  # Manage event (organizer only)
├── staff/
│   └── check-in/
│       └── [eventId]/
│           └── page.tsx                  # Check-in interface (staff only)
├── admin/
│   └── page.tsx                          # Admin dashboard (admin only)
├── auth/
│   ├── login/page.tsx                    # Login (Unit 6)
│   ├── signup/page.tsx                   # Signup (Unit 6)
│   ├── forgot-password/page.tsx          # Forgot password (Unit 6)
│   └── reset-password/page.tsx           # Reset password (Unit 6)
└── unauthorized/
    └── page.tsx                          # Access denied (Unit 6)
```

---

## Public Pages

### 1. Home Page

**File:** `src/app/page.tsx` (Created in Unit 5)  
**Route:** `/`  
**Authentication:** None required

**Features:**

- Hero section with CTAs
- Features showcase
- Upcoming events preview (EventList component)
- Links to browse events and create event

**Already Implemented in Unit 5**

---

### 2. Browse Events Page

**File:** `src/app/events/page.tsx` (~95 lines)  
**Route:** `/events`  
**Authentication:** None required

**Features:**

- Search and filter form
- Status filter (upcoming, ongoing, past)
- Full-text search by title/description
- EventList component integration
- Suspense for loading state

**Search Params:**

```typescript
interface SearchParams {
  search?: string;
  status?: "upcoming" | "ongoing" | "past";
}
```

**Implementation:**

```typescript
export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { search, status } = searchParams;

  return (
    <div>
      {/* Search Form */}
      <form method="get">
        <input name="search" defaultValue={search} />
        <select name="status" defaultValue={status || 'upcoming'}>
          <option value="upcoming">Upcoming Events</option>
          <option value="ongoing">Ongoing Events</option>
          <option value="past">Past Events</option>
        </select>
        <button type="submit">Apply Filters</button>
      </form>

      {/* Event List with Suspense */}
      <Suspense fallback={<LoadingSpinner />}>
        <EventList status={status} searchQuery={search} limit={12} />
      </Suspense>
    </div>
  );
}
```

---

### 3. Event Detail Page

**File:** `src/app/events/[slug]/page.tsx` (Created in Unit 5)  
**Route:** `/events/[slug]`  
**Authentication:** Public for published events, auth for drafts

**Features:**

- Event information (title, description, date, location, capacity)
- Registration form (RegistrationForm component)
- Ticket types display
- Sold out / registration closed states
- Server-side data fetching

**Already Implemented in Unit 5**

---

## Authenticated User Pages

### 4. My Tickets Page

**File:** `src/app/my/registrations/page.tsx` (~180 lines)  
**Route:** `/my/registrations`  
**Authentication:** Required (all roles)

**Features:**

- List all user's event registrations
- Tabs for status: Upcoming, Attended, Cancelled
- QR code preview for each ticket
- Event details (title, date, location, ticket type, price)
- Links to full QR ticket page
- Cancel registration button (for confirmed tickets)
- Empty state with CTA to browse events

**Data Fetching:**

```typescript
const { user, profile } = await requireAuth("/my/registrations");

const { data: registrations } = await supabase
  .from("registrations")
  .select(
    `
    *,
    event:events(*),
    ticket_type:ticket_types(*)
  `,
  )
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
```

**Grouping:**

```typescript
const confirmed = registrations?.filter((r) => r.status === "confirmed") || [];
const checkedIn = registrations?.filter((r) => r.status === "checked_in") || [];
const cancelled = registrations?.filter((r) => r.status === "cancelled") || [];
```

**UI Components:**

- Registration cards with event info
- Mini QR code preview (112x112px)
- "View QR Code" and "Cancel Registration" actions
- Icons for date, location, ticket type

---

### 5. Ticket Detail Page (QR Code)

**File:** `src/app/my/registrations/[id]/page.tsx` (~200 lines)  
**Route:** `/my/registrations/[id]`  
**Authentication:** Required (ticket owner only)

**Features:**

- Full-size QR code display (QRCodeDisplay component)
- Download QR code button
- Check-in instructions
- Event details (title, date, location)
- Ticket information (type, price)
- Checked-in status badge
- Cancelled status message
- Cancel registration button
- Back link to My Tickets

**Authorization:**

```typescript
const { data: registration } = await supabase
  .from("registrations")
  .select(`*,event:events(*),ticket_type:ticket_types(*)`)
  .eq("id", params.id)
  .eq("user_id", user.id) // Ensure ownership
  .single();

if (!registration) {
  notFound();
}
```

**Status Rendering:**

- `confirmed`: Show full QR code and actions
- `checked_in`: Show QR code + green "Checked In" badge
- `cancelled`: Show red "Ticket Cancelled" message, hide QR

---

## Organizer Pages

### 6. My Events Page (Organizer Dashboard)

**File:** `src/app/organizer/events/page.tsx` (~200 lines)  
**Route:** `/organizer/events`  
**Authentication:** Required (organizer or admin)

**Features:**

- List all events created by organizer
- Statistics dashboard (total, published, drafts, completed)
- Event cards with:
  - Title and status badge
  - Start date
  - Registration count (sold / capacity)
  - Ticket types count
  - "Manage" and "View" buttons
- Empty state with CTA to create event
- "Create New Event" button in header

**Role Protection:**

```typescript
const { user, profile } = await requireRole(["organizer", "admin"]);
```

**Data Fetching:**

```typescript
const { data: events } = await supabase
  .from("events")
  .select(
    `
    *,
    ticket_types(count),
    registrations(count)
  `,
  )
  .eq("organizer_id", user.id)
  .order("created_at", { ascending: false });
```

**Stats Cards:**

- Total Events
- Published Events (green)
- Draft Events (yellow)
- Completed Events (blue)

**Status Badges:**

- `published`: Green badge
- `draft`: Yellow badge
- `cancelled`: Red badge
- `completed`: Blue badge

---

### 7. Create Event Page

**File:** `src/app/organizer/create/page.tsx` (~60 lines)  
**Route:** `/organizer/create`  
**Authentication:** Required (organizer or admin)

**Features:**

- CreateEventForm component
- Instructions text
- Back link to My Events
- Centered layout with max-width

**Role Protection:**

```typescript
await requireRole(["organizer", "admin"]);
```

**Form Integration:**

- Uses CreateEventForm from Unit 5
- On success, redirects to event edit page
- Form handles validation and API call

---

### 8. Event Management Page (To Be Created)

**File:** `src/app/organizer/events/[id]/page.tsx` (Not yet implemented)  
**Route:** `/organizer/events/[id]`  
**Authentication:** Required (event organizer or admin)

**Planned Features:**

- Event details editor
- Ticket type management
- Registration list
- Publish/unpublish event
- Send reminders
- Cancel event
- View statistics

**To be implemented in future iteration**

---

## Staff Pages

### 9. Check-in Interface (To Be Created)

**File:** `src/app/staff/check-in/[eventId]/page.tsx` (Not yet implemented)  
**Route:** `/staff/check-in/[eventId]`  
**Authentication:** Required (staff assigned to event, or admin)

**Planned Features:**

- QRScanner component integration
- Real-time attendee list
- Manual check-in option
- Check-in statistics
- Search attendees

**To be implemented in future iteration**

---

## Admin Pages

### 10. Admin Dashboard (To Be Created)

**File:** `src/app/admin/page.tsx` (Not yet implemented)  
**Route:** `/admin`  
**Authentication:** Required (admin only)

**Planned Features:**

- System-wide statistics
- User management
- Event management (all events)
- Send system reminders
- View logs

**To be implemented in future iteration**

---

## Page Patterns

### Server Component Pattern

Most pages are Server Components (default in App Router):

```typescript
export default async function PageName() {
  // Server-side data fetching
  const data = await fetchData();

  // Server-side authentication
  const { user, profile } = await requireAuth();

  return (
    <div>
      {/* Render with fetched data */}
    </div>
  );
}
```

**Benefits:**

- SEO-friendly
- Faster initial load
- Secure data fetching
- No client-side bundle

---

### Protected Page Pattern

Pages requiring authentication:

```typescript
import { requireAuth } from "@/lib/auth/helpers";

export default async function ProtectedPage() {
  const { user, profile } = await requireAuth("/intended/url");

  // User is guaranteed to be authenticated
  // If not, they were redirected to login
}
```

---

### Role-Protected Page Pattern

Pages requiring specific role:

```typescript
import { requireRole } from "@/lib/auth/helpers";

export default async function RoleProtectedPage() {
  const { user, profile } = await requireRole(["organizer", "admin"]);

  // User is guaranteed to have required role
  // If not, they were redirected to /unauthorized
}
```

---

### Dynamic Route Pattern

Pages with URL parameters:

```typescript
export default async function DynamicPage({
  params,
}: {
  params: { id: string };
}) {
  // Access route parameter
  const id = params.id;

  // Fetch data based on parameter
  const data = await fetchById(id);

  if (!data) {
    notFound(); // Next.js 404 page
  }

  return <div>{/* Render */}</div>;
}
```

---

### Search Params Pattern

Pages with query parameters:

```typescript
interface SearchParams {
  search?: string;
  page?: string;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { search, page } = searchParams;

  // Use params in data fetching
  const results = await searchData(search, parseInt(page || '1'));

  return <div>{/* Render results */}</div>;
}
```

---

## Data Fetching Patterns

### Supabase Query Pattern

```typescript
const supabase = createServerClient();

const { data, error } = await supabase
  .from("table_name")
  .select("column1, column2, related:table(*)") // Join with relations
  .eq("user_id", user.id) // Filter
  .order("created_at", { ascending: false }) // Sort
  .limit(10); // Limit results

if (error) {
  console.error("Fetch error:", error);
}
```

---

### Ownership Validation Pattern

Ensure user owns the resource:

```typescript
const { data: resource } = await supabase
  .from("resources")
  .select("*")
  .eq("id", params.id)
  .eq("user_id", user.id) // IMPORTANT: Ownership check
  .single();

if (!resource) {
  notFound(); // Resource doesn't exist or user doesn't own it
}
```

---

## Navigation Patterns

### Link Pattern

```typescript
import Link from 'next/link';

<Link
  href="/events/my-event-slug"
  className="text-blue-600 hover:text-blue-700"
>
  View Event
</Link>
```

---

### Programmatic Navigation (Client Component)

```typescript
'use client';

import { useRouter } from 'next/navigation';

export function MyComponent() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/destination');
  };

  return <button onClick={handleClick}>Navigate</button>;
}
```

---

### Back Navigation

```typescript
<Link href="/previous/page">
  <svg>← Back Arrow</svg>
  Back to Previous Page
</Link>
```

---

## Loading States

### Suspense Pattern

```typescript
import { Suspense } from 'react';

export default async function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AsyncComponent />
    </Suspense>
  );
}
```

---

### Loading Spinner Component

```typescript
function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
    </div>
  );
}
```

---

## Error Handling

### Not Found Pattern

```typescript
import { notFound } from "next/navigation";

if (!data) {
  notFound(); // Renders app/not-found.tsx
}
```

---

### Error Boundary (To Be Created)

Create `app/error.tsx`:

```typescript
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## Styling Patterns

### Page Container

```typescript
<div className="min-h-screen bg-gray-50 py-8">
  <div className="container mx-auto px-4">
    {/* Page content */}
  </div>
</div>
```

---

### Card Layout

```typescript
<div className="rounded-lg bg-white p-8 shadow-sm">
  {/* Card content */}
</div>
```

---

### Grid Layout

```typescript
<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <div key={item.id}>{/* Grid item */}</div>
  ))}
</div>
```

---

## Integration with Other Units

### Unit 5: Frontend Components

Pages use components created in Unit 5:

- `EventList` - Browse events, home page
- `CreateEventForm` - Create event page
- `RegistrationForm` - Event detail page
- `QRCodeDisplay` - Ticket detail page
- `QRScanner` - Check-in page (planned)

---

### Unit 6: Authentication

Pages use auth helpers from Unit 6:

- `requireAuth()` - Protect pages
- `requireRole()` - Role-based access
- `getCurrentUser()` - Conditional rendering
- `Navigation` - All pages include nav component

---

### Unit 4: API Routes

Pages interact with API routes from Unit 4:

- Event creation → POST /api/events/create
- Registration → POST /api/events/[id]/register
- Data fetching → GET /api/events, GET /api/my/registrations
- Check-in → POST /api/check-in (planned)

---

### Unit 2: Supabase Client

Pages use Supabase client for data fetching:

```typescript
import { createServerClient } from "@/lib/supabase/server";

const supabase = createServerClient();
```

---

## Metadata and SEO

### Static Metadata

```typescript
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Events - EventHub",
  description: "Manage your events and registrations",
};
```

---

### Dynamic Metadata

```typescript
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const event = await fetchEvent(params.slug);

  return {
    title: `${event.title} - EventHub`,
    description: event.description.slice(0, 160),
  };
}
```

---

## Summary

**Unit 7: Page Routes** provides the complete user-facing interface using Next.js 14 App Router:

**Pages Created in This Unit:**

1. ✅ `/events` - Browse and search events (95 lines)
2. ✅ `/my/registrations` - User's tickets list (180 lines)
3. ✅ `/my/registrations/[id]` - QR ticket detail (200 lines)
4. ✅ `/organizer/events` - Organizer dashboard (200 lines)
5. ✅ `/organizer/create` - Create event page (60 lines)

**Pages from Unit 5 & 6:** 6. ✅ `/` - Home page (Unit 5) 7. ✅ `/events/[slug]` - Event detail (Unit 5) 8. ✅ `/auth/login` - Login (Unit 6) 9. ✅ `/auth/signup` - Signup (Unit 6) 10. ✅ `/auth/forgot-password` - Forgot password (Unit 6) 11. ✅ `/auth/reset-password` - Reset password (Unit 6) 12. ✅ `/unauthorized` - Access denied (Unit 6)

**Total Lines of Code:** ~735 lines (new pages)

**Key Features:**

- Server Components for optimal performance
- Server-side authentication and authorization
- Protected routes with requireAuth/requireRole
- Dynamic routes with parameters
- Search params for filtering
- Supabase data fetching
- Integration with all previous units

**Remaining Pages (To Be Implemented):**

- `/organizer/events/[id]` - Event management interface
- `/staff/check-in/[eventId]` - Check-in with QR scanner
- `/admin` - Admin dashboard

**Next Steps:**

- **Unit 8:** Email Templates (Event notifications)
- **Unit 9:** Testing (Unit, integration, E2E)
- **Unit 10:** Deployment (Production setup)

This unit completes the core user-facing pages, enabling users to browse events, register, view tickets, and organizers to create and manage events.
