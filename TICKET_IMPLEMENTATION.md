# Ticket Purchase & Check-in Implementation

## ✅ Implemented Features

### 1. **My Tickets Page** (`/my/tickets`)

**Mục đích:** Hiển thị tất cả vé/đăng ký của user

**Tính năng:**

- ✅ Danh sách vé theo trạng thái (Upcoming, Past, Cancelled)
- ✅ Card hiển thị thông tin event: Tên, ngày, địa điểm, loại vé, giá
- ✅ Status badges: Confirmed, Attended, Cancelled, Past
- ✅ Gradient placeholder cho events không có ảnh
- ✅ Click vào card → Xem chi tiết vé và QR code
- ✅ Empty state với link đến browse events

**Cách truy cập:**

- URL: `/my/tickets`
- Navigation: User Menu → "My Tickets"
- Protected: Yêu cầu đăng nhập

---

### 2. **Ticket Detail Page** (`/my/registrations/[id]`)

**Mục đích:** Hiển thị chi tiết vé với QR code

**Tính năng:**

- ✅ Success message với icon check
- ✅ Event image/gradient placeholder
- ✅ Thông tin event đầy đủ (Date, Time, Location)
- ✅ Ticket type info (Name, Description, Price, Status)
- ✅ **QR Code Display** - Show QR code để check-in
- ✅ Registration details (ID, ngày đăng ký)
- ✅ Action buttons:
  - View All My Tickets
  - View Event Details
  - Print Ticket (window.print)
- ✅ Cancel Registration button (nếu chưa check-in)

**Cách truy cập:**

- URL: `/my/registrations/{registrationId}`
- Redirect tự động sau khi đăng ký event thành công
- Click vào ticket card từ My Tickets page

---

### 3. **Staff Check-in Page** (`/staff/checkin`)

**Mục đích:** QR Scanner cho staff/organizer check-in attendees

**Tính năng:**

- ✅ **QR Scanner Component** với camera
- ✅ Event selection dropdown
- ✅ Start/Stop scanner controls
- ✅ Real-time scan result feedback (Success/Error/Info)
- ✅ Recent check-ins list
- ✅ Instructions panel
- ✅ Available events list
- ✅ Role badge (Staff/Organizer/Admin)

**QR Scanner Features:**

- ✅ HTML5 camera access
- ✅ Auto-pause sau mỗi scan (2 giây)
- ✅ Parse và validate QR code JSON
- ✅ Check event match
- ✅ Call check-in API
- ✅ Display attendee info sau scan thành công
- ✅ Error handling cho:
  - Invalid QR format
  - Wrong event
  - Already checked in
  - Cancelled registration

**Permissions:**

- ✅ Staff: Check-in tất cả events
- ✅ Organizer: Chỉ check-in events của mình
- ✅ Admin: Full access

**Cách truy cập:**

- URL: `/staff/checkin`
- Navigation: User Menu → "Event Check-in" (cho Staff/Organizer/Admin)
- Protected: Yêu cầu role Staff, Organizer, hoặc Admin

---

## 🔧 Backend Implementation

### API Endpoint: `POST /api/staff/checkin`

**Purpose:** Process QR code check-in

**Request Body:**

```json
{
  "registrationId": "uuid",
  "eventId": "uuid"
}
```

**Validation Steps:**

1. ✅ Authenticate user (requireAuth)
2. ✅ Check role (staff/organizer/admin)
3. ✅ Validate request body
4. ✅ Fetch registration with joins (event, ticket_type, attendee)
5. ✅ **Verify QR signature** (HMAC-SHA256)
6. ✅ Check organizer permission (nếu role = organizer)
7. ✅ Validate status (not cancelled, not already checked in)
8. ✅ Update status → 'checked_in' + timestamp
9. ✅ Return attendee info

**Response (Success):**

```json
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "registrationId": "uuid",
    "attendeeName": "John Doe",
    "ticketType": "VIP",
    "checkedInAt": "2026-02-09T10:30:00Z"
  }
}
```

**Error Responses:**

- 400: Invalid QR code format/signature
- 401: Not authenticated
- 403: Insufficient permissions
- 404: Registration not found
- 409: Already checked in / Cancelled
- 500: Server error

---

### QR Code Security (`/src/lib/qr.ts`)

**New Function:** `verifyQRSignature(qrData)`

**Features:**

- ✅ Parse QR data (string or object)
- ✅ Reconstruct payload: `eventId:registrationId:timestamp`
- ✅ Generate expected signature (HMAC-SHA256)
- ✅ **Timing-safe comparison** (prevent timing attacks)
- ✅ Buffer validation

**QR Data Structure:**

```
eventId:registrationId:timestamp:signature
```

**Environment:**

- Secret key: `QR_SECRET_KEY` (256-bit hex)
- Generated: `openssl rand -hex 32`
- Stored: `.env.local`

---

## 🛣️ Registration Flow (Complete)

### User Journey:

1. **Browse Events** (`/events`)
   - User xem danh sách events public
   - Click vào event → Event detail page

2. **View Event & Register** (`/events/[slug]`)
   - Xem thông tin event
   - Chọn ticket type từ RegistrationForm
   - Click "Register for Event"

3. **Backend Processing** (`POST /api/events/[eventId]/register`)
   - Validate user login
   - Check event published & chưa bắt đầu
   - Check ticket availability
   - Check duplicate registration
   - Create registration record (status = 'confirmed')
   - Decrement ticket available count
   - **Generate QR code** với HMAC signature
   - Save QR data to registration.qr_code

4. **Redirect to Ticket** (`/my/registrations/[id]`)
   - Show success message
   - Display event info
   - **Show QR code** để check-in
   - Buttons: View all tickets, Print, Cancel

5. **Check-in at Event** (Staff side)
   - Staff mở `/staff/checkin`
   - Chọn event
   - Start scanner
   - Scan attendee QR code
   - System validate & check-in
   - Show success với attendee name

---

## 📱 User Interface Updates

### Navigation (UserMenu)

**Added Links:**

- ✅ "My Tickets" → `/my/tickets` (All users)
- ✅ "Event Check-in" → `/staff/checkin` (Staff/Organizer/Admin)

**Existing Links:**

- "My Events" → `/organizer/events` (Organizer/Admin)
- "Create Event" → `/organizer/create` (Organizer/Admin)

### Middleware Updates

**Protected Routes:**

- ✅ `/my/*` - Requires authentication
- ✅ `/staff/*` - Requires authentication

**Role Checks:**

- `/staff/checkin` - Staff, Organizer, or Admin role

---

## 📦 Dependencies

**New Package:**

```bash
npm install html5-qrcode
```

**Purpose:** QR code scanning từ camera trong browser

**Usage:**

- `Html5Qrcode` class
- Camera permissions
- Real-time scan detection

---

## 🧪 Testing Guide

### Test Registration Flow:

1. **Login** as regular user (attendee)
2. **Browse** `/events` → Click vào event
3. **Register:** Chọn ticket type → Click "Register"
4. **Verify:** Redirect đến `/my/registrations/[id]`
   - Check QR code hiển thị
   - Check event info đầy đủ
5. **My Tickets:** Click "View All My Tickets"
   - Verify ticket xuất hiện trong list
   - Check status badge = "Confirmed"

### Test Check-in Flow:

1. **Login** as staff/organizer
2. **Navigate:** User Menu → "Event Check-in"
3. **Select Event** từ dropdown
4. **Start Scanner:** Click "Start Scanner"
   - Allow camera permission
5. **Scan QR Code:**
   - Open ticket page ở tab khác
   - Point camera tại QR code
6. **Verify Check-in:**
   - Success message xuất hiện
   - Attendee name hiển thị
   - Recent check-ins list cập nhật
7. **Re-scan:** Scan lại cùng QR code
   - Should show "Already checked in" error

### Test Permission:

1. **Organizer** login
2. **Navigate** `/staff/checkin`
3. **Select** event KHÔNG phải của mình
4. **Scan** QR code
5. **Verify:** Should show "You can only check-in attendees for your own events" error

---

## 🔐 Security Features

### QR Code:

- ✅ HMAC-SHA256 signature
- ✅ 256-bit secret key
- ✅ Timing-safe comparison
- ✅ Prevent forgery/tampering

### API:

- ✅ Authentication required
- ✅ Role-based access control
- ✅ Event ownership verification (organizers)
- ✅ Status validation (prevent duplicate check-in)

### Frontend:

- ✅ Protected routes (middleware)
- ✅ User menu based on role
- ✅ Client-side validation

---

## 📝 Database Schema

### Registrations Table:

**Relevant Columns:**

- `id` - UUID (Primary Key)
- `user_id` - UUID (FK → profiles)
- `event_id` - UUID (FK → events)
- `ticket_type_id` - UUID (FK → ticket_types)
- `status` - enum: 'confirmed', 'checked_in', 'cancelled'
- `qr_code` - text (JSON string with signature)
- `checked_in_at` - timestamp (nullable)
- `created_at` - timestamp

**Indexes:**

- `user_id` - For My Tickets queries
- `event_id` - For check-in queries
- `status` - For filtering

---

## 🎯 Next Steps (Optional Enhancements)

### Email Integration:

- [ ] Send ticket confirmation email với QR code
- [ ] Send reminder email trước event
- [ ] Send check-in confirmation

### Advanced Features:

- [ ] Ticket transfer (chuyển vé cho người khác)
- [ ] Refund requests
- [ ] Waitlist cho sold-out events
- [ ] Multiple tickets per registration
- [ ] Guest check-in (without account)

### Analytics:

- [ ] Check-in rate tracking
- [ ] Real-time attendance dashboard
- [ ] No-show reporting

### Mobile App:

- [ ] React Native app với QR scanner
- [ ] Offline check-in support
- [ ] Push notifications

---

## 🐛 Known Issues

1. **Image tag warning:** Using `<img>` instead of Next.js `<Image />`
   - Non-blocking, only affects optimization
   - Can migrate later for better performance

2. **Camera permissions:**
   - User must allow camera access
   - HTTPS required in production
   - Fallback needed for devices without camera

3. **QR Code size:**
   - May be too small on mobile
   - Consider responsive sizing

---

## ✨ Summary

**3 Major Features Implemented:**

1. ✅ **My Tickets Page** - User xem tất cả vé đã mua
2. ✅ **Ticket Detail Page** - Hiển thị QR code để check-in
3. ✅ **Staff Check-in Page** - QR scanner cho staff

**Complete Flow:**

```
Browse Events → Register → Get QR Ticket → Staff Scan → Check-in ✓
```

**Technologies:**

- Next.js 14 App Router
- Supabase (DB + Auth)
- html5-qrcode (Camera scanning)
- HMAC-SHA256 (Security)
- TypeScript (Type safety)

All core functionality is working and ready for testing! 🚀
