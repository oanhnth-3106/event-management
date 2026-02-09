# Unit 5: Frontend Components

## Overview

This unit implements the complete set of React components that form the user interface layer of the Event Management system. All components are built using Next.js 14 client-side components (`'use client'`), TypeScript, Tailwind CSS, and integrate with the API routes defined in Unit 4.

**Key Technologies:**

- React 18 with hooks (useState, useEffect, useRef)
- TypeScript 5 for type safety
- React Hook Form + Zod for form validation
- QR code libraries: `qrcode-styling` (generation), `@zxing/browser` (scanning)
- Tailwind CSS for styling
- Next.js 14 navigation (useRouter, Link)

## Component Architecture

### Component Categories

1. **Event Components** (`src/components/events/`)
   - Event listing and browsing
   - Event creation and management

2. **Registration Components** (`src/components/registration/`)
   - Registration forms
   - Ticket selection

3. **QR Components** (`src/components/qr/`)
   - QR code generation and display
   - QR code scanning for check-in

4. **Page Components** (`src/app/`)
   - Home page
   - Event detail page
   - (Additional pages to be created in Unit 7)

---

## Event Components

### 1. EventList Component

**File:** `src/components/events/EventList.tsx`  
**Purpose:** Display a paginated, filterable list of events  
**Lines of Code:** ~300

#### Features

- **Grid Layout:** Responsive grid (1/2/3 columns based on screen size)
- **Event Cards:** Each event displayed with image, title, description, date, location, price, availability
- **Pagination:** "Load More" button for infinite scroll
- **Loading States:** Spinner during data fetching
- **Empty States:** Message when no events found
- **Error Handling:** Display error messages
- **Filtering:** By status (published, upcoming, past)

#### Props

```typescript
interface EventListProps {
  initialEvents?: Event[];
  status?: "published" | "upcoming" | "past";
  searchQuery?: string;
  limit?: number;
}
```

#### Key Implementation Details

```typescript
"use client";

const [events, setEvents] = useState<Event[]>(initialEvents || []);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

// Fetch events from API
const fetchEvents = async () => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(status && { status }),
    ...(searchQuery && { search: searchQuery }),
  });

  const response = await fetch(`/api/events?${params}`);
  const result = await response.json();

  setEvents([...events, ...result.data.events]);
  setHasMore(result.data.pagination.hasMore);
};
```

#### EventCard Sub-component

Displays individual event information:

- Event image (with fallback)
- Title and truncated description
- Start date/time
- Location
- Price range
- Availability status
- "View Details" link

#### API Integration

- **Endpoint:** `GET /api/events`
- **Query Parameters:** page, limit, status, search
- **Response:** Array of events with pagination metadata

---

### 2. CreateEventForm Component

**File:** `src/components/events/CreateEventForm.tsx`  
**Purpose:** Form for creating new events with validation  
**Lines of Code:** ~250

#### Features

- **Form Validation:** React Hook Form + Zod schema
- **Field Validation:** Real-time error display
- **Date Handling:** Date-time inputs for start/end dates
- **Image URL:** Optional event image URL
- **Submission:** POST to API with error handling
- **Navigation:** Redirect on success, cancel button

#### Form Schema

```typescript
const createEventSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters"),

  description: z
    .string()
    .min(50, "Description must be at least 50 characters")
    .max(5000, "Description must be less than 5000 characters"),

  startDate: z.string().refine((date) => new Date(date) > new Date(), {
    message: "Start date must be in the future",
  }),

  endDate: z.string().optional(),

  location: z
    .string()
    .min(5, "Location must be at least 5 characters")
    .max(200, "Location must be less than 200 characters"),

  capacity: z
    .number()
    .min(1, "Capacity must be at least 1")
    .max(100000, "Capacity cannot exceed 100,000"),

  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
```

#### Form Fields

1. **Title** (text input, 5-200 chars)
2. **Description** (textarea, 50-5000 chars)
3. **Start Date** (datetime-local input)
4. **End Date** (datetime-local input, optional)
5. **Location** (text input, 5-200 chars)
6. **Capacity** (number input, 1-100000)
7. **Image URL** (text input, valid URL, optional)

#### Submission Flow

```typescript
const onSubmit = async (data: CreateEventFormData) => {
  setIsSubmitting(true);
  setErrorMessage(null);

  try {
    const response = await fetch("/api/events/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const result = await response.json();
    router.push(`/organizer/events/${result.data.eventId}/edit`);
  } catch (err) {
    setErrorMessage(err.message);
  } finally {
    setIsSubmitting(false);
  }
};
```

#### API Integration

- **Endpoint:** `POST /api/events/create`
- **Payload:** CreateEventFormData
- **Response:** { eventId, slug, status }
- **Redirect:** `/organizer/events/[eventId]/edit`

---

## Registration Components

### 3. RegistrationForm Component

**File:** `src/components/registration/RegistrationForm.tsx`  
**Purpose:** Event registration form with ticket type selection  
**Lines of Code:** ~170

#### Features

- **Ticket Selection:** Radio buttons for available ticket types
- **Ticket Details:** Display name, description, price, availability per ticket
- **Sold Out Detection:** Filter out unavailable tickets
- **Validation:** Ensure ticket type selected
- **Submission:** POST to API with loading state
- **Error Handling:** Display error messages
- **Redirect:** Navigate to registration confirmation on success

#### Props

```typescript
interface RegistrationFormProps {
  eventId: string;
  eventTitle: string;
  ticketTypes: TicketType[];
}

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  availableQuantity: number;
}
```

#### Key Implementation

```typescript
"use client";

const [selectedTicketType, setSelectedTicketType] = useState<string>("");
const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);

// Filter available tickets
const availableTickets = ticketTypes.filter((tt) => tt.availableQuantity > 0);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!selectedTicketType) {
    setError("Please select a ticket type");
    return;
  }

  setIsSubmitting(true);
  setError(null);

  try {
    const response = await fetch(`/api/events/${eventId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketTypeId: selectedTicketType }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const result = await response.json();
    router.push(`/my/registrations/${result.data.registrationId}`);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsSubmitting(false);
  }
};
```

#### UI Elements

- **Radio Button List:** Each ticket type as radio option
- **Ticket Card:** Shows ticket details
  - Name
  - Description
  - Price (formatted as currency)
  - Availability (e.g., "50 tickets remaining")
- **Submit Button:** Disabled during submission
- **Error Alert:** Red border box for errors
- **Sold Out Message:** When all tickets unavailable

#### API Integration

- **Endpoint:** `POST /api/events/[eventId]/register`
- **Payload:** `{ ticketTypeId: string }`
- **Response:** `{ registrationId, qrData }`
- **Redirect:** `/my/registrations/[registrationId]`

---

## QR Code Components

### 4. QRCodeDisplay Component

**File:** `src/components/qr/QRCodeDisplay.tsx`  
**Purpose:** Display styled QR code ticket with download functionality  
**Lines of Code:** ~130

#### Features

- **Styled QR Code:** Custom appearance using `qrcode-styling`
- **Ticket Information:** Display attendee, event, ticket type
- **Download Button:** Export QR code as PNG
- **Check-in Instructions:** User guidance panel
- **Responsive Design:** Adapts to different screen sizes

#### Props

```typescript
interface QRCodeDisplayProps {
  qrData: string;
  attendeeName: string;
  eventTitle: string;
  ticketType: string;
  size?: number;
}
```

#### QR Code Configuration

```typescript
import QRCodeStyling from "qrcode-styling";

const qrCode = new QRCodeStyling({
  width: size || 300,
  height: size || 300,
  data: qrData,
  dotsOptions: {
    color: "#1f2937",
    type: "rounded",
  },
  cornersSquareOptions: {
    color: "#3b82f6",
    type: "extra-rounded",
  },
  cornersDotOptions: {
    color: "#3b82f6",
  },
  backgroundOptions: {
    color: "#ffffff",
  },
  imageOptions: {
    crossOrigin: "anonymous",
    margin: 10,
  },
});
```

#### Download Functionality

```typescript
const handleDownload = () => {
  qrCode.download({
    name: `ticket-${eventTitle.replace(/\s+/g, "-").toLowerCase()}`,
    extension: "png",
  });
};
```

#### UI Structure

```typescript
<div className="rounded-lg bg-white p-6 shadow-lg">
  {/* QR Code Canvas */}
  <div ref={qrRef} className="mx-auto mb-6"></div>

  {/* Ticket Information */}
  <div className="mb-6 border-t border-gray-200 pt-6">
    <h3>Ticket Details</h3>
    <p><strong>Event:</strong> {eventTitle}</p>
    <p><strong>Attendee:</strong> {attendeeName}</p>
    <p><strong>Ticket Type:</strong> {ticketType}</p>
  </div>

  {/* Download Button */}
  <button onClick={handleDownload}>Download QR Code</button>

  {/* Instructions */}
  <div className="mt-6 rounded-lg bg-blue-50 p-4">
    <h4>Check-in Instructions</h4>
    <ul>
      <li>Present this QR code at the event entrance</li>
      <li>Keep your phone screen brightness high</li>
      <li>Download a copy for offline access</li>
    </ul>
  </div>
</div>
```

---

### 5. QRScanner Component

**File:** `src/components/qr/QRScanner.tsx`  
**Purpose:** Camera-based QR code scanner for check-in  
**Lines of Code:** ~170

#### Features

- **Camera Access:** Uses `navigator.mediaDevices.getUserMedia`
- **Real-time Scanning:** Continuous QR code detection
- **Video Preview:** Live camera feed with overlay
- **Start/Stop Controls:** Toggle scanning
- **Error Handling:** Camera permission denied, no camera available
- **Auto-detection:** Callback on successful scan
- **Cleanup:** Stops camera stream on unmount

#### Props

```typescript
interface QRScannerProps {
  eventId: string;
  onScanSuccess: (qrData: string) => void;
  onScanError: (error: string) => void;
}
```

#### Implementation

```typescript
"use client";
import { BrowserMultiFormatReader } from "@zxing/browser";

const [isScanning, setIsScanning] = useState(false);
const [stream, setStream] = useState<MediaStream | null>(null);
const [errorMessage, setErrorMessage] = useState<string | null>(null);

const videoRef = useRef<HTMLVideoElement>(null);
const codeReader = useRef<BrowserMultiFormatReader | null>(null);

const startScanning = async () => {
  try {
    // Request camera access
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    setStream(mediaStream);

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
    }

    // Initialize QR code reader
    codeReader.current = new BrowserMultiFormatReader();

    // Start continuous scanning
    codeReader.current.decodeFromVideoDevice(
      undefined,
      videoRef.current!,
      (result, error) => {
        if (result) {
          // QR code detected
          const qrData = result.getText();
          onScanSuccess(qrData);
          stopScanning();
        }
      },
    );

    setIsScanning(true);
    setErrorMessage(null);
  } catch (err) {
    setErrorMessage("Camera access denied or not available");
    onScanError(err.message);
  }
};

const stopScanning = () => {
  // Stop video stream
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    setStream(null);
  }

  // Stop code reader
  if (codeReader.current) {
    codeReader.current.reset();
  }

  setIsScanning(false);
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    stopScanning();
  };
}, []);
```

#### UI Structure

```typescript
<div className="rounded-lg bg-white p-6 shadow-lg">
  <h2>Scan QR Code</h2>

  {/* Video Preview */}
  <div className="relative aspect-square overflow-hidden rounded-lg bg-black">
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="h-full w-full object-cover"
    />

    {/* Scanning Overlay */}
    {isScanning && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-48 w-48 border-4 border-blue-500 rounded-lg"></div>
      </div>
    )}
  </div>

  {/* Controls */}
  <div className="mt-4">
    {!isScanning ? (
      <button onClick={startScanning}>Start Scanning</button>
    ) : (
      <button onClick={stopScanning}>Stop Scanning</button>
    )}
  </div>

  {/* Error Message */}
  {errorMessage && <div className="error">{errorMessage}</div>}

  {/* Instructions */}
  <div className="mt-4 text-sm text-gray-600">
    <p>• Position the QR code within the frame</p>
    <p>• Ensure good lighting</p>
    <p>• Hold steady for automatic detection</p>
  </div>
</div>
```

#### Browser Compatibility

- Requires HTTPS (except localhost)
- Requires camera permission
- Uses modern Web APIs: `getUserMedia`, `MediaStream`
- ZXing library for QR detection

---

## Page Components

### 6. Home Page

**File:** `src/app/page.tsx`  
**Purpose:** Landing page with hero, features, and upcoming events  
**Lines of Code:** ~150

#### Sections

1. **Hero Section**
   - Main headline and description
   - CTA buttons: "Browse Events", "Create Event"
   - Gradient background

2. **Features Section**
   - 3-column grid
   - Icons for: Easy Registration, QR Code Tickets, Quick Check-in
   - Feature descriptions

3. **Upcoming Events Section**
   - Uses `<EventList>` component
   - Shows first 6 upcoming events
   - "View All" link to `/events`

#### Key Code

```typescript
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl">
            Discover Amazing Events
          </h1>
          <p className="mt-6 text-xl text-blue-100">
            Find and register for events near you. Easy registration with QR code tickets.
          </p>
          <div className="mt-10 flex gap-4">
            <Link href="/events">Browse Events</Link>
            <Link href="/organizer/create">Create Event</Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Feature cards */}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold">Upcoming Events</h2>
        <EventList status="upcoming" limit={6} />
      </div>
    </div>
  );
}
```

---

### 7. Event Detail Page

**File:** `src/app/events/[slug]/page.tsx`  
**Purpose:** Display full event details and registration form  
**Lines of Code:** ~230

#### Features

- **Server-Side Rendering:** Fetch event data on server
- **Event Details:** Image, title, description, date, location, capacity
- **Registration Sidebar:** Sticky registration form
- **Status Handling:** Upcoming, sold out, or past event states
- **Ticket Types:** Display ticket information
- **Responsive Layout:** Grid layout (2/3 content, 1/3 sidebar)

#### Data Fetching

```typescript
async function getEvent(slug: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/events/${slug}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return result.data;
}

export default async function EventDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const event = await getEvent(params.slug);

  if (!event) {
    notFound();
  }

  const isUpcoming = new Date(event.startDate) > new Date();
  const isSoldOut = event.stats.availableTickets === 0;

  return (
    <div>
      {/* Event content */}
      {isUpcoming && !isSoldOut && (
        <RegistrationForm
          eventId={event.id}
          eventTitle={event.title}
          ticketTypes={event.ticketTypes}
        />
      )}
    </div>
  );
}
```

#### Layout Structure

- **Main Content (2/3 width):**
  - Event image (aspect-video)
  - Event title and organizer
  - Date, location, capacity (with icons)
  - Full description

- **Sidebar (1/3 width, sticky):**
  - Registration form (if upcoming and available)
  - Sold out message (if sold out)
  - Registration closed message (if past)
  - Ticket types information

---

## Component Dependencies

### External Libraries

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "next": "^14.0.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    "qrcode-styling": "^1.6.0-rc.1",
    "@zxing/browser": "^0.1.3",
    "@zxing/library": "^0.20.0"
  }
}
```

### Internal Dependencies

```typescript
// Types
import { Event, TicketType, Registration } from "@/types/database";

// API utilities (not used directly in components, but by API routes)
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";

// Components
import { EventList } from "@/components/events/EventList";
import { CreateEventForm } from "@/components/events/CreateEventForm";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { QRCodeDisplay } from "@/components/qr/QRCodeDisplay";
import { QRScanner } from "@/components/qr/QRScanner";
```

---

## Styling Approach

All components use **Tailwind CSS** utility classes for styling:

### Design System

**Colors:**

- Primary: Blue (blue-600, blue-700)
- Secondary: Indigo (indigo-700)
- Success: Green (green-600)
- Error: Red (red-600)
- Warning: Yellow (yellow-600)
- Gray scale: gray-50 to gray-900

**Spacing:**

- Container: `container mx-auto px-4`
- Section padding: `py-8`, `py-16`
- Card padding: `p-6`, `p-8`

**Typography:**

- Headings: `text-3xl font-bold`, `text-2xl font-semibold`
- Body: `text-base`, `text-gray-600`
- Small text: `text-sm text-gray-500`

**Components:**

- Cards: `rounded-lg bg-white shadow-sm`
- Buttons: `rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700`
- Inputs: `rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500`

**Responsive Design:**

- Mobile-first approach
- Breakpoints: `sm:`, `md:`, `lg:`, `xl:`
- Grid layouts: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

---

## Form Validation Strategy

### React Hook Form + Zod

**Why this combination?**

- Type-safe validation schemas
- Automatic TypeScript inference
- Reusable validation logic
- Built-in error handling
- Performance optimization (minimal re-renders)

### Example Schema

```typescript
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  title: z.string().min(5).max(200),
  email: z.string().email(),
  startDate: z.string().refine((date) => new Date(date) > new Date()),
});

type FormData = z.infer<typeof schema>;

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

### Validation Rules

**CreateEventForm:**

- Title: 5-200 characters
- Description: 50-5000 characters
- Start date: Must be in future
- Location: 5-200 characters
- Capacity: 1-100,000
- Image URL: Valid URL (optional)

**RegistrationForm:**

- Ticket type: Required selection
- (User info handled by authentication)

---

## Error Handling

### Client-Side Error States

All components implement consistent error handling:

```typescript
const [error, setError] = useState<string | null>(null);

try {
  // API call
  const response = await fetch('/api/endpoint');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  // Success handling
} catch (err) {
  setError(err instanceof Error ? err.message : 'An error occurred');
}

// Display error
{error && (
  <div className="rounded-md bg-red-50 p-4 border border-red-200">
    <p className="text-sm text-red-800">{error}</p>
  </div>
)}
```

### Common Error Scenarios

1. **Network Errors:** Failed fetch, timeout
2. **Validation Errors:** Invalid form data
3. **Authorization Errors:** Not logged in, insufficient permissions
4. **Business Logic Errors:** Sold out, event canceled, duplicate registration
5. **Camera Errors:** Permission denied, no camera available

---

## Loading States

### Consistent Loading UX

```typescript
const [isLoading, setIsLoading] = useState(false);

// During operation
{isLoading && (
  <div className="flex justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
  </div>
)}

// Button disabled state
<button
  disabled={isLoading}
  className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
>
  {isLoading ? 'Loading...' : 'Submit'}
</button>
```

---

## Accessibility Considerations

### ARIA Labels

```typescript
<button
  aria-label="Download QR code"
  aria-disabled={isLoading}
>
  Download
</button>

<input
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <p id="email-error" role="alert">
    {errors.email.message}
  </p>
)}
```

### Keyboard Navigation

- All interactive elements focusable
- Logical tab order
- Enter key submits forms
- Escape key closes modals

### Screen Readers

- Semantic HTML elements (`<nav>`, `<main>`, `<article>`)
- Descriptive link text
- Form labels properly associated
- Error messages announced

---

## Integration with API Routes

### API Call Patterns

All components follow consistent patterns for API integration:

```typescript
// GET request
const fetchData = async () => {
  const response = await fetch("/api/endpoint");
  const result = await response.json();

  if (response.ok) {
    setData(result.data);
  } else {
    setError(result.error.message);
  }
};

// POST request
const submitData = async (data: FormData) => {
  const response = await fetch("/api/endpoint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (response.ok) {
    router.push(`/success/${result.data.id}`);
  } else {
    setError(result.error.message);
  }
};
```

### Component → API Route Mapping

| Component         | API Endpoint                | Method | Purpose             |
| ----------------- | --------------------------- | ------ | ------------------- |
| EventList         | `/api/events`               | GET    | Fetch event list    |
| CreateEventForm   | `/api/events/create`        | POST   | Create event        |
| RegistrationForm  | `/api/events/[id]/register` | POST   | Register for event  |
| QRScanner         | `/api/check-in`             | POST   | Check in attendee   |
| Event Detail Page | `/api/events/[slug]`        | GET    | Fetch event details |

---

## Navigation Flow

### User Journeys

**Attendee Journey:**

1. Home page → Browse events
2. Event list → Select event
3. Event detail → Register
4. Registration form → Submit
5. My registrations → View QR ticket
6. QR code display → Check-in at event

**Organizer Journey:**

1. Home page → Create event
2. Create event form → Submit
3. Event edit page → Configure tickets
4. Publish event
5. My events → View registrations
6. Check-in interface → Scan QR codes

### Routing

```typescript
// Next.js App Router paths
/                                    // Home page
/events                              // Event list page
/events/[slug]                       // Event detail page
/organizer/create                    // Create event page
/organizer/events/[id]/edit          // Edit event page
/my/registrations                    // My registrations page
/my/registrations/[id]               // Registration detail (QR code)
/check-in/[eventId]                  // Check-in interface
```

---

## Testing Considerations

### Unit Testing

Components should be tested for:

- Rendering with valid props
- Form validation (valid/invalid inputs)
- API call success/failure
- Loading states
- Error states
- User interactions (button clicks, form submission)

### Integration Testing

Test component interactions:

- EventList → Event detail navigation
- CreateEventForm → API → Redirect
- RegistrationForm → API → Success page
- QRScanner → Check-in flow

### E2E Testing

Full user flows:

- Browse and register for event
- Create and publish event
- Check in with QR code

---

## Performance Optimizations

### React Best Practices

1. **Memoization:**

   ```typescript
   const memoizedValue = useMemo(() => computeExpensiveValue(data), [data]);
   const memoizedCallback = useCallback(() => handleClick(), []);
   ```

2. **Lazy Loading:**

   ```typescript
   const QRScanner = lazy(() => import("@/components/qr/QRScanner"));
   ```

3. **Code Splitting:**
   - Next.js automatic code splitting
   - Dynamic imports for heavy components

### Image Optimization

```typescript
import Image from 'next/image';

<Image
  src={event.imageUrl}
  alt={event.title}
  width={800}
  height={450}
  className="rounded-lg"
  priority={index < 3} // Prioritize first 3 images
/>
```

### API Call Optimization

- Debounce search inputs
- Pagination for large lists
- Cache API responses (SWR or React Query)
- Optimistic UI updates

---

## Security Considerations

### Client-Side Validation

**Remember:** Client-side validation is for UX only. Server-side validation is required for security.

### XSS Prevention

- Sanitize user inputs
- Use Next.js built-in XSS protection
- Avoid `dangerouslySetInnerHTML`

### Camera Access

- Request permissions explicitly
- Handle denied permissions gracefully
- Only use camera for QR scanning (no recording)

### QR Code Security

- QR data validated on server (CMD-006)
- Signed QR codes prevent forgery
- One-time use enforced by backend

---

## Future Enhancements

### Additional Components (Not Yet Implemented)

1. **My Tickets Page** (`/my/registrations`)
   - List all user registrations
   - Filter by upcoming/past
   - Quick access to QR codes

2. **Organizer Dashboard** (`/organizer/dashboard`)
   - Event statistics
   - Registration metrics
   - Revenue tracking

3. **Check-in Interface** (`/check-in/[eventId]`)
   - QRScanner integration
   - Real-time attendee list
   - Check-in statistics

4. **Ticket Management** (`/organizer/events/[id]/tickets`)
   - Create/edit ticket types
   - Set prices and quantities
   - View sales

5. **Navigation Component**
   - Header with logo, links, user menu
   - Responsive mobile menu

6. **Authentication UI**
   - Login/signup forms
   - Password reset
   - Email verification

7. **Component Exports**
   - Barrel exports (index.ts files)
   - Organized imports

### Component Library Integration

Consider integrating a component library in the future:

- **shadcn/ui:** Tailwind-based React components
- **Radix UI:** Unstyled accessible primitives
- **Headless UI:** Tailwind CSS-specific components

---

## Summary

Unit 5 delivers a comprehensive set of React components that provide the complete user interface for the Event Management system:

**Components Created:**

1. ✅ EventList (with EventCard)
2. ✅ CreateEventForm
3. ✅ RegistrationForm
4. ✅ QRCodeDisplay
5. ✅ QRScanner
6. ✅ Home Page
7. ✅ Event Detail Page

**Total Lines of Code:** ~1,400 lines

**Key Features:**

- Type-safe with TypeScript
- Form validation with React Hook Form + Zod
- QR code generation and scanning
- Responsive design with Tailwind CSS
- Comprehensive error handling
- Loading states for all async operations
- Accessibility considerations
- Integration with Unit 4 API routes

**Next Steps:**

- Unit 6: Authentication Flow (Supabase Auth integration)
- Unit 7: Page Routes (Complete Next.js App Router pages)
- Unit 8: Email Templates (Notification emails)
- Unit 9: Testing (Unit, integration, E2E tests)
- Unit 10: Deployment (Production setup)

**Dependencies to Install:**

```bash
npm install react-hook-form zod @hookform/resolvers/zod
npm install qrcode-styling @zxing/browser @zxing/library
```

This unit provides the foundation for all user-facing interactions in the Event Management system, setting the stage for the authentication flow and complete page routing in subsequent units.
