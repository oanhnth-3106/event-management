# Production Deployment Checklist

Use this checklist to ensure all steps are completed before and after deployment.

## Pre-Deployment

### 1. Code Quality

- [ ] All TypeScript errors resolved (`npx tsc --noEmit`)
- [ ] All ESLint warnings resolved (`npm run lint`)
- [ ] All tests passing (`npm run test`)
- [ ] Test coverage meets target (80%+)
- [ ] Code reviewed and approved
- [ ] All debug console.logs removed or wrapped in conditionals

### 2. Database

- [ ] Supabase project created
- [ ] Database migrations run successfully
- [ ] RLS policies enabled on all tables
- [ ] RLS policies tested (try accessing as different users)
- [ ] Indexes created for performance
- [ ] Database backups configured

### 3. Environment Variables

- [ ] All required environment variables documented in `.env.example`
- [ ] Production environment variables added to Vercel
- [ ] QR secret key generated (32+ characters)
- [ ] Same QR secret used across all environments
- [ ] Service role key kept secret (not in client code)
- [ ] Email provider API keys configured
- [ ] Cron secret key generated and added
- [ ] App URL set to production domain

### 4. Authentication

- [ ] Supabase Auth configured
- [ ] Email confirmation flow tested
- [ ] Password reset flow tested
- [ ] Social auth providers configured (if applicable)
- [ ] Redirect URLs configured in Supabase
- [ ] Email templates customized in Supabase

### 5. Email System

- [ ] Email provider account created
- [ ] Sender domain verified
- [ ] Test email sent successfully
- [ ] Email templates reviewed
- [ ] Unsubscribe functionality tested (if applicable)
- [ ] Email rate limits understood

### 6. File Storage (if using)

- [ ] Supabase Storage bucket created
- [ ] Storage policies configured
- [ ] Image upload tested
- [ ] File size limits configured
- [ ] Allowed file types configured

### 7. Deployment Platform (Vercel)

- [ ] Vercel account created
- [ ] GitHub repository connected
- [ ] Build settings configured
- [ ] All environment variables added
- [ ] Preview deployments tested
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active

### 8. Scheduled Jobs

- [ ] Cron routes created (`/api/cron/*`)
- [ ] Cron secret configured
- [ ] Cron schedule configured in `vercel.json`
- [ ] Cron jobs tested manually
- [ ] Cron job authentication verified

### 9. Security

- [ ] All secrets in environment variables (not in code)
- [ ] CORS configured properly
- [ ] Rate limiting considered
- [ ] Input validation on all API routes
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled
- [ ] Dependencies audited (`npm audit`)

### 10. Performance

- [ ] Images optimized
- [ ] Next.js Image component used
- [ ] Database queries optimized
- [ ] Page revalidation configured
- [ ] Static pages identified
- [ ] Dynamic pages identified
- [ ] Loading states implemented
- [ ] Error boundaries implemented

### 11. Monitoring & Logging

- [ ] Error tracking configured (Sentry, etc.)
- [ ] Vercel Analytics enabled
- [ ] Database monitoring configured
- [ ] Email delivery monitoring configured
- [ ] Alert thresholds configured

### 12. Documentation

- [ ] README.md updated
- [ ] API documentation complete
- [ ] Deployment guide reviewed
- [ ] User guide created (if applicable)
- [ ] Admin guide created (if applicable)

---

## Deployment

### 1. Initial Deployment

- [ ] Code pushed to main branch
- [ ] CI/CD pipeline passes
- [ ] Vercel deployment successful
- [ ] Build logs reviewed (no errors)
- [ ] Deployment URL accessible

### 2. Database Setup

- [ ] Migrations applied to production
- [ ] RLS policies active
- [ ] Functions deployed
- [ ] Triggers active

### 3. First Admin User

- [ ] Admin account created
- [ ] Role set to 'admin'
- [ ] Login tested
- [ ] Admin dashboard accessible

---

## Post-Deployment

### 1. Smoke Tests

- [ ] Homepage loads
- [ ] Navigation works
- [ ] Search works
- [ ] Images load correctly
- [ ] Mobile responsive

### 2. Authentication Tests

- [ ] Signup works
- [ ] Email confirmation received
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works
- [ ] Protected routes redirect correctly

### 3. User Flow Tests

- [ ] Browse events
- [ ] View event details
- [ ] Register for event
- [ ] Receive confirmation email
- [ ] View ticket/QR code
- [ ] QR code validates correctly

### 4. Organizer Flow Tests

- [ ] Create event
- [ ] Edit event
- [ ] Publish event
- [ ] Create ticket types
- [ ] View registrations
- [ ] Check-in attendee (QR scan)
- [ ] Cancel event
- [ ] Cancellation email sent

### 5. Admin Flow Tests

- [ ] View all events
- [ ] View all users
- [ ] Moderate content
- [ ] View analytics

### 6. Email Tests

- [ ] Registration confirmation sent
- [ ] 24h reminder sent (test with cron)
- [ ] 2h reminder sent (test with cron)
- [ ] Cancellation email sent
- [ ] Emails render correctly in email clients
- [ ] Unsubscribe works (if applicable)

### 7. QR Code Tests

- [ ] QR code generates correctly
- [ ] QR code displays in email
- [ ] QR code validates correctly
- [ ] Expired QR code rejected
- [ ] Tampered QR code rejected
- [ ] Already checked-in QR handled correctly

### 8. Performance Tests

- [ ] Page load times acceptable (<3s)
- [ ] API response times acceptable (<1s)
- [ ] Database queries performant
- [ ] No memory leaks
- [ ] No infinite loops

### 9. Security Tests

- [ ] Cannot access other users' data
- [ ] Cannot modify others' events
- [ ] Cannot check-in without permission
- [ ] SQL injection attempts fail
- [ ] XSS attempts fail
- [ ] Rate limiting works (if configured)

### 10. Monitoring Setup

- [ ] Error tracking receiving events
- [ ] Logs accessible and readable
- [ ] Alerts configured
- [ ] Dashboard bookmarked

### 11. Scheduled Jobs Verification

- [ ] Cron jobs running on schedule
- [ ] Cron job logs reviewed
- [ ] Email reminders sending correctly
- [ ] No failed jobs

### 12. Backup & Recovery

- [ ] Database backup verified
- [ ] Backup restoration tested (on staging)
- [ ] Rollback plan documented
- [ ] Team knows rollback procedure

---

## Week 1 Monitoring

### Daily Tasks

- [ ] Check error logs
- [ ] Monitor email delivery rates
- [ ] Review user feedback
- [ ] Check database performance
- [ ] Verify cron jobs running

### Week 1 Review

- [ ] Review analytics
- [ ] Identify performance bottlenecks
- [ ] Gather user feedback
- [ ] Plan improvements
- [ ] Update documentation

---

## Ongoing Maintenance

### Daily

- [ ] Monitor error logs
- [ ] Check email delivery
- [ ] Review failed cron jobs

### Weekly

- [ ] Review user feedback
- [ ] Update dependencies (`npm update`)
- [ ] Check database performance
- [ ] Review security alerts

### Monthly

- [ ] Security audit
- [ ] Performance optimization
- [ ] Database cleanup (old events, etc.)
- [ ] Cost review
- [ ] Feature planning

---

## Scaling Checklist

### When to Scale

#### Database (Supabase)

- [ ] > 500 MB data → Upgrade to Pro
- [ ] > 2 GB bandwidth/month → Upgrade to Pro
- [ ] Slow queries → Add indexes, optimize queries
- [ ] High concurrent users → Enable connection pooling

#### Hosting (Vercel)

- [ ] > 100 GB bandwidth/month → Upgrade to Pro
- [ ] Need edge functions → Upgrade to Pro
- [ ] Need more build minutes → Upgrade to Pro

#### Email

- [ ] > 3,000 emails/month (Resend free) → Upgrade
- [ ] > 100 emails/day (SendGrid free) → Upgrade
- [ ] Poor deliverability → Review sender reputation

---

## Emergency Contacts

**Team:**

- Developer: [Your Name] - [Email] - [Phone]
- PM: [Name] - [Email] - [Phone]

**Services:**

- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Supabase Support: [supabase.com/support](https://supabase.com/support)
- Email Provider: [Check documentation]

**Critical Links:**

- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://supabase.com/dashboard
- Email Provider Dashboard: [Your provider]
- GitHub Repository: [Your repo URL]
- Status Page: [If you have one]

---

## Notes

**Deployment Date:** ********\_********

**Deployed By:** ********\_********

**Production URL:** ********\_********

**Notes:**

---

---

---
