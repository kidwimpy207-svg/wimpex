# Deployment Guide

## Pre-Deployment Checklist

### Security
- [ ] All secrets stored in `.env` (never in code)
- [ ] JWT_SECRET is strong (32+ random characters)
- [ ] CORS_ORIGIN set to production domain
- [ ] Rate limiting enabled
- [ ] HTTPS enforced in production
- [ ] HSTS headers set
- [ ] XSS/CSRF protection enabled

### Testing
- [ ] `npm test` passes
- [ ] All API endpoints tested
- [ ] Error handling working
- [ ] Authentication flows verified
- [ ] Payment webhook tested
- [ ] Email sending tested
- [ ] S3 uploads tested

### Database
- [ ] Data backup created
- [ ] Migration scripts ready (if moving from JSON)
- [ ] Backup retention policy set
- [ ] Recovery procedure documented

### Monitoring
- [ ] Sentry configured
- [ ] Health check endpoint working
- [ ] Log aggregation setup (LogRocket, ELK)
- [ ] Uptime monitoring enabled (UptimeRobot, Healthchecks)
- [ ] Alert rules configured

---

## Deployment Options

### Option 1: Heroku (Easiest for MVP)

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create wimpex-app

# Add buildpacks
heroku buildpacks:add heroku/nodejs

# Set environment variables
heroku config:set JWT_SECRET=your_secret_here
heroku config:set STRIPE_SECRET_KEY=sk_...
heroku config:set AWS_ACCESS_KEY_ID=...
# Add all other secrets

# Deploy
git push heroku main

# Monitor
heroku logs --tail
```

**Cost**: $7-50/month  
**Pros**: Simple, free tier available, built-in scaling  
**Cons**: Limited customization, expensive at scale

---

### Option 2: Railway.app (Modern, Affordable)

```bash
# Install Railway CLI
# https://docs.railway.app/cli/install

# Login
railway login

# Initialize project
railway init

# Set variables
railway variables:set JWT_SECRET=your_secret
railway variables:set STRIPE_SECRET_KEY=sk_...
# Add all other secrets

# Deploy
railway up

# View logs
railway logs
```

**Cost**: $5-20/month  
**Pros**: Affordable, good DX, database support  
**Cons**: Smaller team, less integration options

---

### Option 3: AWS EC2 (Most Control)

```bash
# Launch EC2 instance (Ubuntu 22.04 LTS, t2.micro free tier)
# Security group: 80, 443 (HTTPS), 3000 (optional)

# SSH into instance
ssh -i your-key.pem ubuntu@your-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Clone repository
git clone https://github.com/yourusername/wimpex.git
cd wimpex

# Install dependencies
npm install --production

# Create .env with production secrets
nano .env

# Start app with PM2
pm2 start server/index.js --name "wimpex"
pm2 startup
pm2 save

# Install Nginx (reverse proxy + HTTPS)
sudo apt install nginx -y

# Configure Nginx
sudo nano /etc/nginx/sites-available/default

# Add to Nginx config:
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable SSL with Certbot
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com

# Restart Nginx
sudo systemctl restart nginx

# Set up automated backups
sudo apt install awscli -y
# Create backup script...
```

**Cost**: $5-30/month  
**Pros**: Full control, scalable, databases included  
**Cons**: More setup, need to manage security

---

### Option 4: DigitalOcean (Balanced)

Similar to AWS EC2, but simpler. Use App Platform for managed hosting or Droplets for control.

```bash
# Using DigitalOcean App Platform
# 1. Connect GitHub repo
# 2. Configure environment variables
# 3. Deploy

# Cost: $5-12/month
```

---

### Option 5: Docker + Container Registry

```bash
# Build image
docker build -t wimpex:latest .

# Tag for registry
docker tag wimpex:latest yourusername/wimpex:latest

# Push to Docker Hub
docker push yourusername/wimpex:latest

# Deploy with docker-compose on any server
docker-compose up -d
```

---

## Production Environment Setup

### Database Migration (Optional: Move from JSON to PostgreSQL)

```bash
# 1. Create PostgreSQL database
# 2. Install migration tool
npm install -g db-migrate

# 3. Create migration scripts
db-migrate create create-users-table

# 4. Run migrations
db-migrate up

# 5. Export JSON data and import to PostgreSQL
node scripts/migrate-data.js

# 6. Update connection in config/index.js
# 7. Test thoroughly before deploying
```

### Backup Strategy

```bash
# Automated daily backups (using cron)
# In production environment:

# 1. Database backups (PostgreSQL)
0 2 * * * pg_dump -U user dbname > /backups/db-$(date +\%Y\%m\%d).sql

# 2. S3 data backups
0 3 * * * aws s3 sync /app/data s3://wimpex-backups/daily/$(date +\%Y\%m\%d)/

# 3. Test restore process weekly
```

---

## Monitoring & Alerts

### Sentry (Error Tracking)

```bash
# 1. Create Sentry.io account
# 2. Create project (Node.js)
# 3. Get DSN
# 4. Set in .env: SENTRY_DSN=https://...@sentry.io/...
# 5. Errors will auto-report
```

### UptimeRobot (Uptime Monitoring)

```bash
# 1. Create account on UptimeRobot.com
# 2. Add monitor: http://yourdomain.com/api/health
# 3. Set alert to email/Slack on downtime
```

### CloudFlare (CDN + DDoS Protection)

```bash
# 1. Create CloudFlare account
# 2. Point domain to CloudFlare nameservers
# 3. Enable:
#    - Flexible SSL/TLS
#    - Always HTTPS redirect
#    - Rate limiting
#    - Bot management
```

---

## Scaling Strategy (When Needed)

### Phase 1: Single Server (Now)
- All services on one EC2/VPS
- JSON or single database
- Basic monitoring

### Phase 2: Separate Services (100+ concurrent users)
- App server(s)
- Database server
- Redis cache
- S3 storage
- CDN

### Phase 3: Distributed (1000+ concurrent users)
- Load balancer
- Multiple app servers
- Master-slave database
- Message queue (for async tasks)
- Caching layer (Redis Cluster)
- Separate API servers

---

## Post-Deployment

### Day 1
- [ ] Test all features in production
- [ ] Monitor error logs (Sentry)
- [ ] Check analytics
- [ ] Verify email sending
- [ ] Test payment flow

### Week 1
- [ ] Monitor uptime
- [ ] Track performance metrics
- [ ] Get user feedback
- [ ] Fix any bugs found

### Ongoing
- [ ] Daily log review
- [ ] Weekly security updates
- [ ] Monthly performance optimization
- [ ] Quarterly architecture review

---

## Troubleshooting

### App Won't Start
```bash
# Check logs
pm2 logs wimpex

# Check environment variables
echo $NODE_ENV
echo $JWT_SECRET

# Verify dependencies
npm list

# Check port availability
lsof -i :3000
```

### Database Connection Fails
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL

# Check firewall
sudo ufw status
```

### HTTPS Issues
```bash
# Test SSL certificate
openssl s_client -connect yourdomain.com:443

# Renew certificate
sudo certbot renew
```

### Performance Problems
```bash
# Check CPU/memory
top
ps aux | grep node

# Check disk space
df -h

# Check database
SELECT COUNT(*) FROM users;
```

---

## Useful Commands

```bash
# Check server status
curl http://yourdomain.com/api/health

# View recent logs
pm2 logs wimpex --lines 100

# Restart app
pm2 restart wimpex

# Backup database
pg_dump -U user dbname > backup.sql

# Check database size
du -sh /var/lib/postgresql/

# Monitor real-time logs
tail -f /var/log/syslog | grep node
```

---

## Cost Estimates (Monthly)

| Service | Cost | Notes |
|---------|------|-------|
| Server (EC2/Railway) | $5-20 | Scales with usage |
| Database | $0-15 | Free tier or managed |
| S3 Storage | $0-5 | For uploads |
| Stripe | 2.9% + 30¢ | Payment processing |
| Email (SendGrid) | $0-20 | Pay-as-you-go |
| CDN (CloudFlare) | $0-200 | Mostly free tier |
| **Total** | **$10-50** | For MVP |

---

## Emergency Procedures

### App Crashes
```bash
# Restart with PM2
pm2 restart wimpex

# If that fails, restore from backup
git reset --hard origin/main
npm install
pm2 start server/index.js
```

### Data Loss
```bash
# Restore from backup
psql dbname < backup.sql

# Or restore from S3
aws s3 cp s3://backup-bucket/latest.sql ./
psql dbname < latest.sql
```

### Security Breach
1. Rotate all secrets immediately
2. Review logs for unauthorized access
3. Force password reset for all users
4. Audit 3rd-party integrations
5. Post-mortem and fix vulnerability

---

For more help, see LAUNCH_CHECKLIST.md and MARKETING_LAUNCH.md
