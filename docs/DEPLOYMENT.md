# Deployment Guide

## Overview

This guide covers deploying the Event Management system to production. We'll use **Vercel** for the Next.js application and **Supabase** for the database and authentication.

**Deployment Stack:**

- **Frontend & API:** Vercel (recommended for Next.js)
- **Database:** Supabase (managed PostgreSQL)
- **Auth:** Supabase Auth
- **Email:** Resend (recommended), SendGrid, or SMTP
- **File Storage:** Supabase Storage (for event images)
- **CI/CD:** GitHub Actions

---

## Prerequisites

Before deploying, ensure you have:

- [x] GitHub repository with your code
- [x] Supabase account (free tier available)
- [x] Vercel account (free tier available)
- [x] Email provider account (Resend recommended)
- [x] Custom domain (optional but recommended)

---

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new organization (if needed)
4. Click "New Project"
5. Fill in:
   - **Name:** event-management
   - **Database Password:** Generate strong password (save it!)
   - **Region:** Choose closest to your users
6. Click "Create new project" (takes ~2 minutes)

### 1.2 Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

**Manual Alternative:**

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260206000001_initial_schema.sql`
3. Paste and run
4. Copy contents of `supabase/migrations/20260206000002_command_functions.sql`
5. Paste and run

### 1.3 Get Supabase Credentials

In Supabase Dashboard → Settings → API:

- **Project URL:** `https://xxxxx.supabase.co`
- **Anon/Public Key:** `eyJhbG...` (public, safe for client)
- **Service Role Key:** `eyJhbG...` (secret, server-only)

Save these for environment variables.

### 1.4 Configure Email Templates (Optional)

Supabase Dashboard → Authentication → Email Templates:

- Customize confirmation email
- Customize password reset email
- Add your branding

---

## Step 2: Email Provider Setup

### Option A: Resend (Recommended)

1. Go to [resend.com](https://resend.com)
2. Sign up and verify your email
3. Add and verify your domain
4. Create an API key
5. Save for environment variables

**Free Tier:** 3,000 emails/month

### Option B: SendGrid

1. Go to [sendgrid.com](https://sendgrid.com)
2. Sign up and complete setup
3. Verify sender email/domain
4. Create API key (Settings → API Keys)
5. Save for environment variables

**Free Tier:** 100 emails/day

### Option C: SMTP (Gmail, etc.)

1. Use Gmail App Password or custom SMTP server
2. Note credentials for environment variables

---

## Step 3: Environment Variables

### 3.1 Create `.env.local` for Development

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# QR Code Secret (generate random 32+ character string)
QR_SECRET_KEY=your-secret-key-must-be-at-least-32-characters-long

# Email Provider (choose one: resend, sendgrid, nodemailer)
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=EventHub
EMAIL_SUPPORT=support@yourdomain.com

# Resend (if using)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# SendGrid (if using)
# SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# SMTP (if using)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@email.com
# SMTP_PASS=your-app-password
```

### 3.2 Generate QR Secret Key

```bash
# Generate secure random key (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use OpenSSL
openssl rand -hex 32
```

### 3.3 Vercel Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

**Production Variables:**

- All variables from `.env.local`
- Update `NEXT_PUBLIC_APP_URL` to your production domain
- Use production Supabase project credentials
- Use production email API keys

**Environment:** Select "Production", "Preview", and "Development"

---

## Step 4: Vercel Deployment

### 4.1 Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
5. Select "event-management" repository

### 4.2 Configure Build Settings

Vercel auto-detects Next.js. Verify:

- **Framework Preset:** Next.js
- **Root Directory:** ./
- **Build Command:** `npm run build`
- **Output Directory:** .next
- **Install Command:** `npm install`
- **Node Version:** 18.x

### 4.3 Add Environment Variables

In Vercel project settings:

1. Click "Environment Variables"
2. Add all variables from Step 3.3
3. Make sure to select correct environments

### 4.4 Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Your app is live at `https://your-project.vercel.app`

### 4.5 Custom Domain (Optional)

1. Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` environment variable
5. Redeploy

---

## Step 5: Database Seeding (Optional)

### 5.1 Create Admin User

```sql
-- In Supabase SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('admin@yourdomain.com', crypt('your-password', gen_salt('bf')), NOW());

-- Create admin profile
INSERT INTO profiles (id, email, full_name, role)
SELECT id, email, 'Admin User', 'admin'
FROM auth.users
WHERE email = 'admin@yourdomain.com';
```

**Better Alternative:** Sign up through your app and manually update role:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@yourdomain.com';
```

### 5.2 Create Sample Events (Optional)

```sql
-- Create sample organizer
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES ('organizer@example.com', crypt('password123', gen_salt('bf')), NOW());

INSERT INTO profiles (id, email, full_name, role)
SELECT id, email, 'Sample Organizer', 'organizer'
FROM auth.users
WHERE email = 'organizer@example.com';

-- Create sample event
INSERT INTO events (
  organizer_id,
  title,
  slug,
  description,
  start_date,
  end_date,
  location,
  capacity,
  status
)
SELECT
  id,
  'Tech Conference 2026',
  'tech-conference-2026',
  'A sample tech conference for demonstration',
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '32 days',
  'San Francisco, CA',
  500,
  'published'
FROM profiles
WHERE email = 'organizer@example.com';
```

---

## Step 6: CI/CD with GitHub Actions

### 6.1 Create Workflow File

**File:** `.github/workflows/ci.yml`

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Check TypeScript
        run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: false

  deploy:
    runs-on: ubuntu-latest
    needs: [lint, test]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
```

### 6.2 Add GitHub Secrets

In GitHub repository → Settings → Secrets and variables → Actions:

1. **VERCEL_TOKEN:** Get from Vercel → Settings → Tokens
2. **VERCEL_ORG_ID:** Get from Vercel project settings (`.vercel/project.json`)
3. **VERCEL_PROJECT_ID:** Get from Vercel project settings

---

## Step 7: Scheduled Jobs (Email Reminders)

### 7.1 Create Cron API Routes

**File:** `src/app/api/cron/send-24h-reminders/route.ts`

```typescript
import { NextResponse } from "next/server";
import { sendEventReminders } from "@/lib/email/helpers";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  // Verify cron secret (Vercel Cron)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find events starting in ~24 hours
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 24);
  const windowStart = new Date(tomorrow.getTime() - 3600000); // 23 hours
  const windowEnd = new Date(tomorrow.getTime() + 3600000); // 25 hours

  const { data: events } = await supabase
    .from("events")
    .select("*, registrations(*)")
    .eq("status", "published")
    .gte("start_date", windowStart.toISOString())
    .lte("start_date", windowEnd.toISOString());

  let totalSent = 0;

  for (const event of events || []) {
    // Send reminders
    const result = await sendEventReminders(event, event.registrations, "24h");
    totalSent += result.successCount;
  }

  return NextResponse.json({
    success: true,
    eventCount: events?.length || 0,
    emailsSent: totalSent,
  });
}
```

**File:** `src/app/api/cron/send-2h-reminders/route.ts`

```typescript
// Similar to 24h, but for 2-hour window
```

### 7.2 Configure Vercel Cron

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/send-24h-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/send-2h-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 7.3 Add Cron Secret

Add to Vercel environment variables:

```
CRON_SECRET=your-random-secret-for-cron-jobs
```

---

## Step 8: Monitoring & Analytics

### 8.1 Vercel Analytics

Enable in Vercel Dashboard → Analytics:

- Page views
- Visitor stats
- Performance metrics

### 8.2 Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Configure `sentry.client.config.ts` and `sentry.server.config.ts`.

### 8.3 Database Monitoring

Supabase Dashboard → Database:

- Query performance
- Connection pool usage
- Slow queries

### 8.4 Email Monitoring

Track in your email provider dashboard:

- Delivery rates
- Open rates
- Bounce rates

---

## Step 9: Performance Optimization

### 9.1 Enable Next.js Image Optimization

Already configured via `next.config.js`:

```typescript
images: {
  domains: ['your-supabase-url.supabase.co'],
  formats: ['image/avif', 'image/webp'],
}
```

### 9.2 Enable Vercel Edge Caching

Add to page components:

```typescript
export const revalidate = 60; // Revalidate every 60 seconds
```

### 9.3 Database Connection Pooling

Supabase includes connection pooling by default.

For high traffic, use connection string with port 6543 (pooler):

```
postgresql://postgres:[password]@db.[project-ref].supabase.co:6543/postgres
```

---

## Step 10: Security Checklist

### Pre-Deployment Security

- [x] All environment variables in Vercel (not in code)
- [x] QR secret key is random and secure (32+ chars)
- [x] Service role key never exposed to client
- [x] RLS policies enabled on all tables
- [x] CORS configured (only allow your domain)
- [x] Rate limiting on API routes (optional)
- [x] SQL injection prevention (Supabase handles this)
- [x] XSS prevention (React handles this)
- [x] CSRF protection (Supabase handles this)

### Post-Deployment Security

- [x] Enable Vercel firewall (Pro plan)
- [x] Enable Supabase network restrictions
- [x] Monitor failed login attempts
- [x] Set up alerts for suspicious activity
- [x] Regular database backups (Supabase auto-backup)
- [x] Keep dependencies updated (`npm audit`)

---

## Step 11: Production Checklist

### Before Going Live

- [x] All migrations run successfully
- [x] Environment variables configured
- [x] Email provider tested (send test email)
- [x] Custom domain configured (if applicable)
- [x] SSL certificate active (Vercel auto-provisions)
- [x] Create admin user
- [x] Test complete user flow (signup → register → check-in)
- [x] Test all authentication flows
- [x] Verify QR code generation and validation
- [x] Test email notifications
- [x] Configure scheduled jobs (cron)
- [x] Set up monitoring and alerts
- [x] Review RLS policies
- [x] Run security audit

### Post-Launch

- [x] Monitor error logs
- [x] Check email delivery rates
- [x] Monitor database performance
- [x] Set up daily database backups
- [x] Create user documentation
- [x] Set up support email/system

---

## Troubleshooting

### Common Issues

**1. Build fails on Vercel:**

- Check build logs for specific errors
- Verify all dependencies in `package.json`
- Ensure TypeScript errors are fixed

**2. Database connection fails:**

- Verify Supabase URL and keys
- Check if project is paused (free tier auto-pauses)
- Verify network restrictions

**3. Emails not sending:**

- Check email provider API key
- Verify sender domain is verified
- Check email logs in provider dashboard
- Ensure `EMAIL_FROM` matches verified domain

**4. Authentication not working:**

- Check Supabase auth settings
- Verify email confirmation is disabled (or configured)
- Check RLS policies on profiles table

**5. QR codes not validating:**

- Verify `QR_SECRET_KEY` is same on all environments
- Check timestamp is within valid window
- Ensure QR data format is correct

---

## Rollback Plan

### If deployment fails:

1. **Vercel:** Instant rollback to previous deployment
   - Deployments → Previous deployment → Promote to Production

2. **Database:** Restore from backup

   ```bash
   supabase db pull
   # Fix migration
   supabase db push
   ```

3. **Environment Variables:** Revert in Vercel settings

---

## Support & Maintenance

### Regular Maintenance

**Daily:**

- Monitor error logs
- Check email delivery

**Weekly:**

- Review user feedback
- Update dependencies (`npm update`)
- Check database performance

**Monthly:**

- Security audit
- Database cleanup (old events, etc.)
- Performance optimization

### Scaling Considerations

**Database:**

- Supabase free tier: 500 MB, 2 GB bandwidth
- Upgrade to Pro for unlimited
- Add read replicas for high traffic

**Vercel:**

- Free tier: 100 GB bandwidth
- Upgrade to Pro for more bandwidth, edge functions

**Email:**

- Resend free: 3,000/month
- SendGrid free: 100/day
- Upgrade as needed

---

## Summary

Your Event Management system is now deployed! 🎉

**Production URLs:**

- **App:** `https://your-domain.com`
- **Database:** Managed by Supabase
- **Email:** Managed by your email provider

**Next Steps:**

1. Test all features in production
2. Create your first event
3. Invite beta testers
4. Monitor and iterate

For issues, check logs in:

- Vercel Dashboard → Functions → Logs
- Supabase Dashboard → Logs
- Email provider dashboard
