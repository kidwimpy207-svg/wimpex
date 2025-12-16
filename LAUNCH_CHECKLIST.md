# Wimpex Launch Checklist & Roadmap

## Phase 1: Foundation ✅ (Complete)
- ✅ Root `package.json` with `start` script
- ✅ `.env.example` documenting all required secrets
- ✅ Security middleware scaffolding (helmet, rate-limiting, input validation)
- ✅ S3 presigned URL endpoint for direct uploads
- ✅ Stripe payment integration (checkout, subscriptions, webhooks)
- ✅ Email verification workflow (send, verify, resend)
- ✅ Client-side upload & payment functions

**Server Status**: Running on `http://0.0.0.0:3000` with `/api` prefix.
**Dependencies**: Partially installed (optional modules gracefully degraded if missing).

---

## Phase 2: Configuration & Secrets (NEXT - CRITICAL)
**Time**: 1-2 hours  
**Owner**: You (user)

### Actions Required:
1. **Obtain Stripe Keys**:
   - Go to [stripe.com/dashboard](https://stripe.com/dashboard)
   - Get `STRIPE_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)
   - Get `STRIPE_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)
   - Create two price IDs for Pro ($9.99/mo) and Creator ($19.99/mo) plans
   - Get `STRIPE_WEBHOOK_SECRET` (from Webhooks section)
   - Add to `.env`: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_CREATOR_MONTHLY

2. **AWS S3 Configuration**:
   - Create AWS IAM user with S3 access
   - Generate `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
   - Create S3 bucket (e.g., `wimpex-uploads`)
   - Optional: Set up CloudFront CDN distribution for `CLOUDFRONT_DOMAIN`
   - Add to `.env`: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET, AWS_REGION, CLOUDFRONT_DOMAIN

3. **Email (SMTP) Configuration**:
   - Sign up for SMTP service (SendGrid, Mailgun, AWS SES, etc.)
   - Get `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
   - Set sender email: `EMAIL_FROM=noreply@wimpex.app`
   - Test with: `npm run test-email` (add script to package.json)
   - Add to `.env`: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM

4. **Security Secrets**:
   - Generate strong `JWT_SECRET` (e.g., `openssl rand -base64 32`)
   - Generate `DATA_ENCRYPTION_KEY` for sensitive data
   - Update `.env`: JWT_SECRET, DATA_ENCRYPTION_KEY

5. **Install Missing Dependencies** (optional but recommended):
   ```bash
   npm install helmet express-rate-limit stripe @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```

---

## Phase 3: Core Features (Next Sprint)
**Time**: 1-2 weeks  
**Recommended Order**:

1. **Password Reset** (4 hours)
   - Create `server/routes/auth-reset.js`
   - Add forgot-password flow to client
   - Email templates for reset links

2. **Profile Avatar Upload** (6 hours)
   - Add avatar field to settings UI
   - Integrate with S3 upload
   - Display avatar on profile

3. **Image Processing** (8 hours)
   - Install & configure `sharp`
   - Generate responsive image sizes (thumbnail, medium, large)
   - Serve via CDN with cache headers

4. **Push Notifications Hardening** (4 hours)
   - Verify VAPID keys are valid
   - Test subscription flow in browser
   - Add retry logic & queue persistence

5. **Refresh Tokens & Session** (6 hours)
   - Implement refresh token rotation
   - Extend JWT expiry to 7 days
   - Add logout-all-devices option

---

## Phase 4: Content & Moderation (2-3 weeks)

1. **Moderation Tools** (12 hours)
   - Content reporting endpoint
   - Admin review dashboard
   - Soft-delete / restore flow

2. **Email Verification UI** (4 hours)
   - Add verification status to settings
   - Resend email button
   - Unverified account warnings

3. **Community Guidelines** (4 hours)
   - Draft & display Terms of Service
   - Privacy Policy
   - Cookie consent banner

---

## Phase 5: Testing & CI (1-2 weeks)

1. **Automated Tests** (16 hours)
   - Unit tests (Jest): Auth, email, payment validation
   - Integration tests: Upload, email workflows
   - E2E tests: Signup → Upload → Subscribe flow
   
2. **GitHub Actions CI** (8 hours)
   - Build and test on push
   - Run linting (ESLint)
   - Generate coverage reports
   - Deploy to staging on PR merge

3. **Code Quality** (4 hours)
   - Set up Sentry for error reporting
   - Add logging to key endpoints
   - Monitor performance (response times)

---

## Phase 6: Deployment & Operations (1 week)

1. **Container Setup** (8 hours)
   - Write `Dockerfile` (Node + npm)
   - Create `docker-compose.yml` for local dev
   - Test multi-container setup (app + Redis)

2. **Hosting Options**:
   - **Heroku**: Easiest for MVP, $7-50/mo
   - **Railway**: Modern platform, $5/mo start
   - **AWS EC2**: Most control, $5-30/mo
   - **DigitalOcean**: VPS, $4-6/mo
   - **Vercel/Netlify**: Frontend, separate backend

3. **Database Migration** (Optional but recommended):
   - Move from JSON to PostgreSQL or MongoDB
   - Write migration scripts
   - Backup existing data

4. **Backups & Monitoring** (4 hours)
   - Daily backup cron jobs
   - Uptime monitoring (UptimeRobot, Healthchecks)
   - Error alerting (Slack + Sentry)

---

## Phase 7: Growth & Monetization (2-4 weeks)

1. **Analytics Integration** (8 hours)
   - PostHog or Google Analytics
   - Event tracking (signup, upload, subscribe)
   - User funnels & retention

2. **Referral Program** (8 hours)
   - Generate referral codes
   - Track referrals → rewards
   - UI for sharing codes

3. **Premium Features Gating** (8 hours)
   - Check subscription tier on each endpoint
   - Paywall UI for Pro/Creator features
   - Upgrade prompts

4. **Marketing & Beta** (12 hours)
   - Landing page (Linktree-style)
   - Email invite list signup
   - Twitter/TikTok thread for launch
   - Beta user onboarding flow

---

## Quick Start Commands

```bash
# Install dependencies (if needed)
npm install

# Start dev server
npm start

# Test API
curl -X GET http://localhost:3000/api/health

# Check server logs
# (Server outputs to terminal)

# Stop server
# Press Ctrl+C in terminal, or taskkill /PID <pid> /F (Windows)
```

---

## API Endpoints (Implemented)

### Auth
- `POST /api/auth/signup` — Create account
- `POST /api/auth/login` — Login
- `POST /api/auth/totp` — 2FA verification
- `POST /api/auth/resend` — Resend 2FA

### Email
- `POST /api/email/send-verification` — Send verification email
- `POST /api/email/verify` — Verify email token
- `POST /api/email/resend-verification` — Resend verification

### Payments
- `GET /api/payments/plans` — List subscription plans
- `POST /api/payments/subscribe` — Create subscription
- `POST /api/payments/webhook` — Stripe webhook

### Upload
- `POST /api/upload/presigned` — Get S3 presigned URL

### Settings
- `GET /api/settings` — Get user settings
- `PUT /api/settings` — Update user settings

### Stories (Content)
- `GET /api/stories` — List stories
- `POST /api/stories` — Create story

### Others
- `GET /api/recommendations` — Get recommended users
- `GET /api/onboarding/status` — Check onboarding status

---

## Environment Variables Checklist

```
# Critical (MUST SET BEFORE LAUNCH)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
JWT_SECRET=

# Recommended
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_CREATOR_MONTHLY=
DATA_ENCRYPTION_KEY=
CLOUDFRONT_DOMAIN=
CORS_ORIGIN=https://yourdomain.com

# Optional
SENTRY_DSN=
POSTHOG_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

---

## 30/60/90 Day Launch Plan

### Day 30: MVP Launch
- Secrets configured & tested
- Auth + Email verification working
- Uploads to S3 functional
- Basic Stripe integration (subscribe endpoint)
- Deployed to staging
- Closed beta (50-100 users)
- Social media announcement

### Day 60: Feature Complete
- Password reset workflow
- Image processing & CDN
- Push notifications working
- Moderation dashboard
- Analytics integration
- Open beta (1,000+ users)
- Press release / TechCrunch pitch

### Day 90: Public Launch
- All tests passing (80%+ coverage)
- CI/CD pipeline fully automated
- 3+ deployment environments (dev, staging, prod)
- Mobile-responsive design verified
- Legal docs (ToS, Privacy, DMCA)
- Full marketing campaign
- Production database (if migrated from JSON)

---

## Success Metrics

- **Day 1**: Zero errors in logs, 200ms avg response time
- **Day 7**: 100+ signups, 20% email verified
- **Day 30**: 500+ users, 5% paying customers, <2% churn
- **Day 90**: 2,000+ users, 15% paying, NPS > 30

---

## Support & Debugging

**Common Issues**:
1. "Module not found" → Run `npm install`
2. "Invalid VAPID keys" → Check `.env` VAPID_* variables
3. "S3 permission denied" → Verify AWS credentials & bucket policy
4. "Email not sending" → Check SMTP credentials & whitelist sender

**Debug Logs**:
- Server logs are printed to console (check terminal)
- Client errors visible in browser DevTools Console
- Check `.env` is in repo root (not in `server/`)

---

**You're ~40% of the way there.** The foundation is solid; next step is secrets configuration and testing. Need help with any specific service? Let me know!
