# Launch Marketing & Growth Checklist

## Pre-Launch (Week 1-2)

### Brand & Messaging
- [ ] Create 2-3 minute video explainer of Wimpex
- [ ] Write compelling tagline (e.g., "The social platform for creators")
- [ ] Design logo variations (light, dark, icon-only)
- [ ] Create brand guidelines document

### Website & Landing
- [ ] Build landing page (Webflow, Carrd, or custom HTML)
  - Hero section with CTA ("Join Beta")
  - Feature highlights (3-5 key benefits)
  - Pricing plans preview
  - Testimonials placeholder
  - Email signup for beta waitlist
- [ ] Set up email capture (ConvertKit, Mailchimp, or custom form)
- [ ] Create FAQ page
- [ ] Add Terms of Service (✅ Done)
- [ ] Add Privacy Policy (✅ Done)

### Social Media Setup
- [ ] Create Twitter/X account (@wimpex or @getwimpex)
- [ ] Create TikTok account (if target audience skews young)
- [ ] Create Instagram account
- [ ] Create LinkedIn company page
- [ ] Create Discord server for early community

### Beta Program
- [ ] Recruit 20-50 beta testers (friends, Twitter followers, Product Hunt)
- [ ] Create beta onboarding guide (email + docs)
- [ ] Set up feedback form (Typeform, Google Form, or custom)
- [ ] Plan beta timeline (2-3 weeks)
- [ ] Create bug bounty incentive (e.g., "free Pro tier for bugs found")

### Press Kit
- [ ] Write one-page press release
- [ ] Create media kit (logo, screenshots, founder bio)
- [ ] List of tech journalists to pitch
- [ ] Email template for journalist outreach

---

## Launch Week (Week 3)

### Day 1: Soft Launch
- [ ] Post on Twitter/X with Product Hunt launch link
- [ ] Send beta tester feedback request
- [ ] Post in relevant Reddit communities (r/startups, r/webdev, etc.)
- [ ] Share with Product Hunt (if ready)
- [ ] Monitor uptime and errors

### Day 2-3: Build Momentum
- [ ] Reply to all comments on social posts (engagement matters)
- [ ] Send launch email to waitlist
- [ ] Post TikTok/Instagram video walkthrough
- [ ] Pitch 5-10 micro-influencers in social media space

### Day 4-5: Expand Reach
- [ ] Guest post on Medium or Dev.to
- [ ] HackerNews submission (if built with interesting tech)
- [ ] Post in Slack communities (Indie Hackers, etc.)
- [ ] Follow-up email to early users

### Day 6-7: Analytics & Optimize
- [ ] Review analytics: signups, activation, engagement
- [ ] Fix high-priority bugs from beta feedback
- [ ] Post retrospective on Twitter ("We launched Wimpex...")
- [ ] Plan next week's updates

---

## Growth Metrics (30 Days)

**Target**: 500-1,000 users, 5-10% paying customers

| Metric | Target | Tracking |
|--------|--------|----------|
| Signups | 500+ | Google Analytics, custom dashboard |
| Email Verified | 50%+ | DB query |
| Posts Created | 100+ | DB query |
| Premium Subscribers | 5-10% | Stripe dashboard |
| Daily Active Users | 20-30% | Analytics |
| Churn Rate | <5% | Calculate weekly |

---

## Content Calendar (First 30 Days)

### Week 1: Launch Week
| Day | Content | Platform |
|-----|---------|----------|
| Mon | "We're live!" announcement | Twitter, Email |
| Tue | Feature walkthrough video | TikTok, YouTube |
| Wed | Behind-the-scenes team intro | Twitter, LinkedIn |
| Thu | User testimonial (beta tester) | Twitter, Instagram |
| Fri | "Share your first post" challenge | Twitter, TikTok |
| Sat | Community spotlight (user posts) | Twitter, Instagram |
| Sun | Weekly roundup + stats | Twitter, Email |

### Week 2-4: Growth Phase
- **Mon-Fri**: Daily engagement (reply to users, retweet, share wins)
- **Tue/Thu**: Educational content (tips, tutorials, how-tos)
- **Wed**: Community spotlight
- **Sat**: Stats/transparency update
- **Sun**: Week wrap-up + call for feedback

---

## Paid Marketing (Optional, $500-2,000 budget)

### Twitter Ads
- [ ] Promote "Join Beta" tweet ($100-200)
- [ ] Target: creators, indie hackers, designers
- [ ] Goal: 10,000+ impressions, 200+ clicks

### Facebook/Instagram Ads
- [ ] Carousel ad showing features ($200-300)
- [ ] Video view campaign ($100-200)
- [ ] Target: 18-45, interested in social media

### Google Ads
- [ ] Branded keywords (e.g., "social media app", "creator platform")
- [ ] Budget: $200-300
- [ ] Goal: sign up above organic

---

## Referral Program

### Structure
- **Invite a Friend**: +30 days free Pro for both
- **5 Referrals**: +3 months free Creator tier
- **Leaderboard**: Top referrers get featured

### Implementation
- Generate referral codes: `ref_${uuid}`
- Signup bonus email after N invites
- Dashboard widget showing referral link & count

---

## Beta Feedback & Iteration

### Feedback Collection
- [ ] In-app feedback widget (Crisp, Intercom, or custom)
- [ ] Weekly user survey (Google Form)
- [ ] 1-on-1 user interviews (3-5 early adopters)

### Fast Iterations
- [ ] Bug fixes: within 24 hours
- [ ] Feature requests: prioritize top 5
- [ ] Weekly release updates
- [ ] Transparent changelog (link in app)

---

## Post-Launch (Week 4+)

### Analytics Review
- [ ] Week 1: Did we hit signup targets?
- [ ] Week 2: Are users creating content?
- [ ] Week 3: Which features are used most?
- [ ] Week 4: Are users coming back (retention)?

### Optimization
- [ ] A/B test signup form (CTA text, fields)
- [ ] Optimize onboarding flow (reduce drops)
- [ ] Improve discoverability (trending, recommendations)
- [ ] Add social proof (user count, testimonials)

### Partnerships
- [ ] Reach out to 10 micro-influencers (10k-100k followers)
- [ ] Explore integrations (Twitter, Instagram, Discord)
- [ ] Creator exchange program (offer free Pro tier)

---

## 90-Day Goals

- **Users**: 5,000+
- **Email List**: 10,000+
- **Paid Tier Adoption**: 10-15%
- **Monthly Revenue**: $500-1,000 (from subscriptions)
- **Press Mentions**: 2-3 articles
- **Community Size**: Discord 500+ members, Twitter 2,000+ followers

---

## Key Messaging & Talking Points

**For Different Audiences:**

**Creators**: "Monetize your audience. Upload, engage, earn."
**Indie Hackers**: "Built in 8 weeks with no funding. Open source roadmap."
**VCs/Investors**: "5% week-on-week growth. $1K MRR. Seeking seed round."
**Tech Media**: "The indie social network taking on TikTok & Instagram."

---

## Important Links to Add

- [ ] Link to landing page in Twitter bio
- [ ] Link to product in GitHub README
- [ ] Link to Discord in onboarding flow
- [ ] Link to feedback form in settings
- [ ] Link to roadmap (GitHub Projects or Coda)

---

## Success Metrics to Track Daily

```javascript
// Dashboard to track
{
  "today": {
    "new_signups": 42,
    "new_posts": 18,
    "new_subscribers": 2,
    "dau": 67,
    "uninstalls": 1
  },
  "week": {
    "total_users": 500,
    "posts": 450,
    "subscribers": 25,
    "churn": "2%",
    "feedback_count": 15
  }
}
```

---

**Remember**: Early growth is about community, not vanity metrics. Focus on user happiness over virality.
