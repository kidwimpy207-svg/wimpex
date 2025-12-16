# Environment Variables Guide

## Required for Development

These must be set to run the server locally:

```
PORT=3000                              # Server port (default: 3000)
NODE_ENV=development                   # development | staging | production
JWT_SECRET=your-256-bit-secret-key     # MUST be strong (256+ bits)
API_PREFIX=/api                        # API endpoint prefix (default: /api)
```

**How to generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Email & Notifications

### SMTP Configuration (Optional but recommended for email)
If you want to send signup confirmations, password reset emails, etc.:

```
SMTP_HOST=smtp.resend.com              # or your email provider
SMTP_PORT=587                          # Usually 587 or 465
SMTP_USER=your_email@example.com       # Your email account
SMTP_PASS=your_app_password            # NOT your password; use app-specific token
SMTP_SECURE=true                       # true for port 465, false for 587
EMAIL_FROM=noreply@yourapp.com         # Sender email address
```

**Recommended providers:**
- **Resend** (https://resend.com) - Free tier, great for startups
- **SendGrid** (https://sendgrid.com) - 100 free emails/day
- **Mailgun** (https://mailgun.com) - Free tier for testing
- **Gmail** - Less secure, not recommended for production

### Push Notifications (Web Push)
Required for push notifications. Generate with:

```bash
npx web-push generate-vapid-keys
```

Then set:
```
VAPID_PUBLIC_KEY=your_public_key       # Share with client
VAPID_PRIVATE_KEY=your_private_key     # Keep secret
```

---

## Cloud Storage (Optional, local fallback available)

### S3-Compatible Storage (Backblaze B2, AWS S3, etc.)

```
AWS_ACCESS_KEY_ID=your_key_id
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-west-001                 # Your region
S3_BUCKET=wimpex-uploads               # Bucket name
CDN_BASE_URL=https://cdn.example.com   # Optional: custom CDN URL
```

If not provided, files are saved locally in `data/media/`.

**Free options:**
- **Backblaze B2** (https://www.backblaze.com/b2) - 10 GB free
- **AWS S3** - 12 months free tier
- **DigitalOcean Spaces** (https://digitalocean.com) - $5/month

---

## Database (Optional, JSON fallback for development)

### PostgreSQL (for production)
```
DB_HOST=your_host.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
```

For development, JSON files in `data/` are used by default.

**Free options:**
- **Supabase** (https://supabase.com) - 500 MB free
- **Neon** (https://neon.tech) - Serverless PostgreSQL, free tier
- **Railway** (https://railway.app) - $5/month free tier

---

## Caching (Optional, improves performance)

### Redis (for distributed caching)
```
REDIS_URL=redis://localhost:6379      # Local Redis
# OR
REDIS_REST_URL=https://your-redis.upstash.io
REDIS_TOKEN=your_upstash_token
```

Free Redis hosting:
- **Upstash** (https://upstash.com) - Free tier, serverless

---

## Monitoring & Error Tracking (Optional but recommended)

### Sentry (error tracking)
```
SENTRY_DSN=https://your@ingest.sentry.io/project
```

Get free DSN from https://sentry.io

### Structured Logging
```
LOG_LEVEL=debug                        # debug | info | warn | error
ENABLE_STRUCTURED_LOGS=true            # JSON logs for production
```

---

## Security & Compliance

### Data Encryption (highly recommended)
Generate a 64-character hex key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then set:
```
DATA_ENCRYPTION_KEY=your_64_char_hex_key
```

### Compliance Flags
```
GDPR_ENABLED=true                      # Enable GDPR compliance
CCPA_ENABLED=true                      # Enable CCPA compliance
DATA_RETENTION_DAYS=365                # How long to keep user data
DATA_DELETION_GRACE_PERIOD_DAYS=30     # Grace period before hard delete
```

### Session Management
```
SESSION_TIMEOUT_MINUTES=30             # Session expiry (default: 30 min)
MAX_ACTIVE_SESSIONS_PER_USER=5         # Max concurrent sessions
DEVICE_TRUST_ENABLED=true              # Allow user to trust devices
```

---

## Payments (Optional, for monetization)

### Stripe (production payments)
```
STRIPE_SECRET_KEY=sk_test_...          # Test key for development
STRIPE_PUBLISHABLE_KEY=pk_test_...     # Public key for client
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook signing secret
```

Get keys from https://stripe.com (test mode by default)

Test card numbers:
- `4242 4242 4242 4242` - Success
- `4000 0000 0000 0002` - Declined

---

## OAuth (Optional, for social login)

### Google OAuth
```
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

Get from: https://console.developers.google.com/

---

## Feature Flags & A/B Testing

```
AB_TEST_ENABLED=true                   # Enable A/B testing
FEATURE_ONBOARDING_ENABLED=true        # Enable onboarding flow
FEATURE_RECOMMENDATIONS_ENABLED=true   # Enable friend recommendations
FEATURE_TRENDING_ENABLED=true          # Enable trending feed
```

---

## Accessibility & Localization

```
DEFAULT_LANGUAGE=en                    # Default language
SUPPORTED_LANGUAGES=en,es,fr,de,pt     # Comma-separated list
LOCALIZATION_ENABLED=false             # i18n support (experimental)
WCAG_ENABLED=true                      # WCAG AA compliance
WCAG_LEVEL=AA                          # A | AA | AAA
KEYBOARD_NAVIGATION_ENABLED=true       # Keyboard support
```

---

## Monetization

```
ADS_ENABLED=false                      # Google Ads support
SUBSCRIPTION_ENABLED=true              # Allow subscriptions
PREMIUM_FEATURES_ENABLED=false         # Premium-only features
GOOGLE_ADS_CLIENT_ID=                  # For Google Ads
GOOGLE_ADS_SLOT_ID=                    # For Google Ads slots
```

---

## Backup & Disaster Recovery

```
BACKUP_ENABLED=true                    # Enable automatic backups
BACKUP_INTERVAL_HOURS=24               # How often to backup (24h = daily)
BACKUP_RETENTION_DAYS=30               # How long to keep backups
BACKUP_DESTINATION=s3                  # s3 | local | gcs
```

---

## Quick Setup (Minimal Working Setup)

For local development, you only need:

```bash
cat > .env << 'EOF'
PORT=3000
NODE_ENV=development
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
VAPID_PUBLIC_KEY=BCk8M2V9Z3p4V5Y6X7Z8A9B0C1D2E3F4G5H6I7J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9
VAPID_PRIVATE_KEY=A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2
GDPR_ENABLED=true
CCPA_ENABLED=true
DATA_RETENTION_DAYS=365
DATA_DELETION_GRACE_PERIOD_DAYS=30
EOF
```

Then run:
```bash
npm install
npm start
```

---

## Production Checklist

Before deploying:

- [ ] **JWT_SECRET** - Set to strong random value
- [ ] **NODE_ENV** - Set to `production`
- [ ] **Email** - Configure real SMTP provider
- [ ] **Storage** - Use S3, B2, or similar cloud storage
- [ ] **Database** - Migrate from JSON to PostgreSQL
- [ ] **Redis** - Set up for caching and sessions
- [ ] **HTTPS** - Enable TLS/SSL certificate
- [ ] **Monitoring** - Configure Sentry DSN
- [ ] **Backups** - Enable automated backups with encryption
- [ ] **Rate Limiting** - Enable globally
- [ ] **CORS** - Configure allowed origins
- [ ] **CSRF** - Enable CSRF protection
- [ ] **Security Headers** - Add helmet.js
- [ ] **Data Encryption** - Set DATA_ENCRYPTION_KEY
- [ ] **Payment Gateway** - Switch Stripe to production keys

---

## Troubleshooting

**"Cannot find module 'nodemailer'"**
- Run: `npm install nodemailer`

**"VAPID keys not configured"**
- Server will generate temporary keys on startup
- For production, set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY

**"S3 upload failing"**
- Check AWS credentials are correct
- Ensure bucket exists and is accessible
- Files will save to `data/media/` as fallback

**"Database connection refused"**
- For development, JSON files are used (no DB required)
- For production, configure PostgreSQL or another DB

**Email not sending?**
- Check SMTP credentials
- Look for: `📧 Email not sent (no SMTP configured)` in logs
- Emails log to console in development mode

