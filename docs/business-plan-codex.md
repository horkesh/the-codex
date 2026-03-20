# Codex — Business Plan & Market Strategy

**Document version:** March 2026
**Product:** AI-powered lifestyle chronicle platform
**Working name:** Codex (or Momento for camera-first positioning)

---

## Executive Summary

Codex is a premium private journaling platform that transforms everyday moments — dinners, nights out, trips, gatherings — into AI-narrated, beautifully styled chronicles. Unlike social media (public performance) or plain journals (text-only), Codex combines a styled camera (Momento), AI-generated narrative prose, relationship intelligence (Circle mind map), and Instagram-ready export templates (Studio).

The product sits at the intersection of three growing markets: digital journaling ($5.7B, 11.5% CAGR), premium camera apps ($2B+), and private social platforms. No existing product combines all three.

**The ask:** Transform the existing 3-user private app into a multi-tenant SaaS product with a freemium model, targeting friend groups, couples, and solo lifestyle documenters.

---

## 1. Market Research

### 1.1 Market Size

| Segment | 2025 Size | 2033 Projection | CAGR |
|---|---|---|---|
| Digital journal apps | $5.7B | $13.2B | 11.5% |
| Photo editing/camera apps | $2.1B | $4.8B | 10.8% |
| Private social apps | $1.2B | $3.5B | 14.2% |

**Total addressable market (TAM):** ~$9B (2025)
**Serviceable addressable market (SAM):** ~$800M (premium lifestyle journaling + camera)
**Serviceable obtainable market (SOM):** ~$8M (first 3 years, realistic indie capture)

### 1.2 Competitive Landscape

| Competitor | Users | Revenue | Model | What they lack |
|---|---|---|---|---|
| **VSCO** | 200M signups, 160K Pro subs | ~$24M/yr | $59.99/yr Pro | No journaling, no AI, no narrative |
| **BeReal** | 40M MAU | ~$5-10M/yr | Ads + partnerships | No curation, no aesthetic, disposable |
| **Locket** | 9M DAU, 80M downloads | Profitable (undisclosed) | Freemium widget | Couples only, no group chronicle |
| **Polarsteps** | 18M users | ~$10M/yr | Physical books + affiliate | Travel only, no AI narrative, no camera |
| **Day One** | ~2M users | ~$15M/yr | $49.99/yr Premium | Plain journal, no camera, no social layer |
| **Dazz/1998 Cam** | 50M+ downloads | ~$20M/yr | $4.99 one-time + IAP | Camera only, no journal, no AI |

### 1.3 Gap Analysis

No product combines:
- Styled camera overlays (Momento) + AI narrative generation + relationship graph + trip intelligence + export templates

The closest would be VSCO (camera + community) + Day One (journal) + Polarsteps (travel) — three separate apps. Codex is all three in one, unified by an AI layer that writes the story for you.

### 1.4 Target Demographics

**Primary:** 18-35, urban, aesthetically conscious, documenting lifestyle with friends
- Sub-segment A: Friend groups (3-8 people) who go out together regularly
- Sub-segment B: Couples documenting their relationship
- Sub-segment C: Solo lifestyle documenters who want premium private journaling

**Secondary:** 25-45 travelers who want intelligent trip documentation (competing with Polarsteps)

**Psychographic:** Values premium aesthetics, privacy over publicity, curation over raw posting. "I want to remember this night, but I don't want to post about it."

---

## 2. Product Positioning

### 2.1 Two-Track Strategy

**Track A: "Codex" — Group Chronicle Platform**
- Full platform: Chronicle + Momento + Circle + Missions + Studio + Passport
- Target: friend groups, couples, families
- Pitch: *"Your private story, narrated by AI"*
- Price: $4.99/mo per group (up to 8 members)

**Track B: "Momento" — AI Camera Journal (recommended launch product)**
- Standalone: Momento camera + Chronicle + Studio exports
- Target: aesthetic-conscious individuals
- Pitch: *"Every photo becomes a story"*
- Price: Free (3 entries/week) + $2.99/mo Premium (unlimited + all overlays + AI lore)

**Recommendation:** Launch with Track B. It's simpler, the camera is a proven hook (Dazz/VSCO model), and it can grow into Track A once the user base is established. The camera → journal → share loop is tight and viral.

### 2.2 Core Value Propositions

1. **AI Lore** — "Take a photo. Get a story." Every entry generates narrative prose in your chronicle's voice. This is the retention mechanic — people come back to read what the AI wrote about their night.

2. **Momento Camera** — 8 styled overlays + 6 filters + location-aware + instant share. This is the acquisition mechanic — shareable photos with a distinctive look drive organic discovery.

3. **Studio Exports** — Instagram-ready 4:5 templates. This is the viral mechanic — every shared template is free advertising with the Codex brand mark.

4. **Relationship Intelligence** — Circle mind map with recency heat, tap-to-focus, connection mapping. This is the "wow" feature that differentiates in demos and press.

---

## 3. Transformation Model (Private to Multi-Tenant)

### 3.1 Architecture Changes

| Component | Current (Private) | Target (Multi-Tenant) |
|---|---|---|
| Auth | 3 fixed users, magic link | Open registration, email/password + OAuth (Google, Apple) |
| Data model | Single implicit group | `groups` table, `group_members`, group-scoped entries |
| RLS | Simple authenticated checks | Group-scoped row-level security policies |
| Gent identity | Hardcoded 3 gents in `gent-identities.ts` | User-configurable profiles with display name, alias, avatar |
| Design system | Fixed gold/obsidian | Theme picker (3-5 preset themes at launch) |
| AI prompts | Hardcoded gent names | Dynamic group member names from profile data |
| Billing | None | Stripe + RevenueCat (iOS/Android) |

### 3.2 Database Migration Plan

**Phase 1: Multi-tenancy core (2-3 weeks)**
```
groups (id, name, created_by, theme, plan, created_at)
group_members (group_id, user_id, role, alias, joined_at)
```
- All existing tables gain a `group_id` FK
- RLS policies rewritten: `auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = entries.group_id)`
- Migration script maps existing data to a default group

**Phase 2: Billing (1-2 weeks)**
```
subscriptions (id, group_id, stripe_customer_id, plan, status, current_period_end)
usage_limits (group_id, ai_generations_used, ai_generations_limit, reset_at)
```

**Phase 3: Onboarding (1 week)**
- Sign up → create or join group → set name/alias/avatar → pick theme → first entry

### 3.3 AI Cost Management

| Operation | Model | Cost per call | Free tier limit | Pro limit |
|---|---|---|---|---|
| Lore generation | claude-sonnet-4-6 | ~$0.04 | 3/week | Unlimited |
| Title from photo | claude-haiku-4-5 | ~$0.005 | With lore | With lore |
| Photo analysis (mission) | gemini-2.5-flash | ~$0.008 per photo | N/A | 20 photos/mission |
| Mission narrative | claude-sonnet-4-6 | ~$0.08 | N/A | Unlimited |
| Portrait generation | imagen-4.0 | ~$0.04 | 1/month | 5/month |
| Stamp generation | claude-haiku-4-5 | ~$0.01 | With mission | With mission |

**Average AI cost per entry:** ~$0.05 (basic) to ~$0.30 (mission with photos)
**Average AI cost per user per month:** ~$0.60 (assuming 15 entries/month)

At $2.99/mo subscription, AI costs represent ~20% of revenue — healthy margin.

### 3.4 Infrastructure Costs at Scale

| Users (MAU) | Supabase | Vercel | AI APIs | Total/mo | Revenue/mo (10% conversion) | Margin |
|---|---|---|---|---|---|---|
| 1,000 | $25 | $20 | $60 | $105 | $300 | 65% |
| 10,000 | $75 | $40 | $600 | $715 | $3,000 | 76% |
| 50,000 | $200 | $100 | $3,000 | $3,300 | $15,000 | 78% |
| 100,000 | $400 | $200 | $6,000 | $6,600 | $30,000 | 78% |

Note: Supabase Pro ($25/mo) handles up to ~100K MAU comfortably. Vercel Pro ($20/mo) with CDN handles traffic well. The dominant cost is AI APIs, which scale linearly with usage but are gated by the subscription model.

---

## 4. Monetization Strategy

### 4.1 Freemium Model

**Free Tier:**
- 3 chronicle entries per week
- 3 Momento overlays (Field Report, Marquee, Polaroid)
- 2 filters (None, Mono)
- Basic lore (2-3 sentences)
- No Studio export
- No missions/travel features
- 1 portrait per month

**Premium ($2.99/month or $29.99/year):**
- Unlimited entries
- All 8 overlays + future additions
- All 6 filters
- Full Chronicle lore (4-6 sentences, Director's Notes)
- Studio export templates
- Missions with full intelligence pipeline
- 5 portraits per month
- Passport with stamps + achievements
- Circle mind map with full features

**Group Plan ($4.99/month, up to 8 members):**
- Everything in Premium
- Shared chronicle, reactions, comments
- Multi-participant entries
- Group lore with all member names
- Relationship intelligence (Circle)

### 4.2 Revenue Projections (Conservative)

| Timeline | MAU | Conversion | MRR | ARR |
|---|---|---|---|---|
| Month 6 | 5,000 | 8% | $1,200 | $14,400 |
| Month 12 | 25,000 | 10% | $7,500 | $90,000 |
| Month 18 | 75,000 | 12% | $27,000 | $324,000 |
| Month 24 | 150,000 | 12% | $54,000 | $648,000 |
| Year 3 | 300,000 | 14% | $126,000 | $1.5M |

These projections assume organic growth + minimal paid marketing ($500/mo TikTok ads from month 6).

### 4.3 Additional Revenue Streams

1. **Physical print books** (Polarsteps model) — $29.99-49.99 per chronicle book. High margin, proven demand. Polarsteps makes the majority of their $10M revenue from this.

2. **Brand partnerships** — sponsored overlays/filters for events, festivals, venues. "The [Festival Name] Momento overlay" — brands pay for branded camera templates.

3. **Enterprise/wedding tier** — wedding chronicles, corporate retreat documentation. $99/event one-time.

---

## 5. Marketing Strategy

### 5.1 Phase 1: Pre-Launch (Weeks 1-8)

**Build in public:**
- Twitter/X thread series: "I built an AI that writes noir stories about your dinner photos" — show the lore generation in action
- TikTok content (3x/week): short-form demos of Momento overlays, before/after AI lore, mind map network reveals
- Landing page with email waitlist: "Join the Chronicle" — collect 2,000 emails before launch

**Content pillars:**
1. "Watch this AI write about my night out" — lore generation demos
2. "POV: your photos but make it cinema" — Momento overlay comparisons
3. "This app mapped all my friendships" — mind map reveals
4. "We documented our entire trip and the AI wrote a classified briefing" — mission intelligence

### 5.2 Phase 2: Launch (Weeks 8-16)

**App Store Optimization:**
- Primary keywords: "AI journal", "photo journal", "camera overlay", "lifestyle chronicle"
- Screenshots showcasing: Momento camera, AI lore generation, Studio exports, mind map
- App preview video: 15-second loop showing photo → AI lore → styled export → share

**Launch strategy:**
- Product Hunt launch (target #1 Product of the Day)
- Submit to Apple's "Apps We Love" editorial team
- Reach out to 20 lifestyle/tech micro-influencers (10K-100K followers) for honest reviews
- Reddit posts in r/journaling, r/photography, r/ios, r/androidapps

**Referral mechanic:**
- Every Studio export includes the Codex brand mark (bottom corner)
- "Made with Codex" watermark on free tier exports (removed on Premium)
- Share invite link from app → friend gets 1 week Premium free

### 5.3 Phase 3: Growth (Months 4-12)

**Organic flywheel:**
1. User takes Momento photo → applies overlay → shares to Instagram Story
2. Friends see the distinctive aesthetic → "what app is that?" → download
3. New user creates chronicle → AI writes lore → user is delighted → shares another Momento
4. Repeat

This is the same growth loop that made VSCO, Dazz, and Huji Camera viral. The key is that the **output is inherently shareable and visually distinctive**.

**Paid growth (small budget):**
- $500/mo TikTok Spark Ads (boost best-performing organic content)
- $300/mo Apple Search Ads (brand + category keywords)
- Target CPI: $1.50 (industry avg for camera/photo apps: $2-3)

**Content marketing:**
- Weekly blog: "Chronicle of the Week" — anonymized real user stories with AI lore
- Monthly "Wrapped" — like Spotify Wrapped but for your social life. Shareable cards showing your month's stats

### 5.4 Viral Mechanics Built Into the Product

| Mechanic | How it works | Expected viral coefficient |
|---|---|---|
| Studio exports with brand mark | Every shared image = free advertising | 0.1-0.3 |
| Momento overlays | Distinctive look drives "what app?" questions | 0.2-0.4 |
| Group invites | Creating a group requires inviting friends | 0.5-1.0 |
| Weekly digest share | "Our week in review" shareable card | 0.1-0.2 |
| Passport stamps | Collectible stamps shared on social | 0.05-0.1 |

**Target compound viral coefficient:** 1.1-1.5 (>1.0 = organic growth exceeds churn)

---

## 6. Technical Roadmap

### 6.1 Phase 1: MVP Transformation (8 weeks)

| Week | Deliverable |
|---|---|
| 1-2 | Multi-tenant DB schema + migration + RLS policies |
| 3-4 | Open registration + onboarding flow (name, alias, avatar, theme) |
| 5-6 | Stripe/RevenueCat billing integration + usage limits |
| 7 | Landing page + App Store listing + TestFlight beta |
| 8 | Launch preparation, bug fixes, performance audit |

### 6.2 Phase 2: Growth Features (Weeks 9-20)

| Week | Deliverable |
|---|---|
| 9-10 | Push notifications (lore ready, weekly digest, friend activity) |
| 11-12 | iOS native shell (Capacitor or React Native wrapper for App Store) |
| 13-14 | Android build + Google Play listing |
| 15-16 | Referral system + invite mechanics |
| 17-18 | Monthly Wrapped cards (auto-generated, shareable) |
| 19-20 | Physical print book integration (API partner: Blurb or Mixbook) |

### 6.3 Phase 3: Scale (Months 5-12)

- AI model optimization (batch processing, caching, cheaper model fallbacks)
- CDN-optimized image pipeline (Cloudflare Images or imgproxy)
- Localization (Spanish, French, German — largest European markets)
- API for third-party integrations (widget, Shortcuts)

---

## 7. Financial Plan

### 7.1 Startup Costs

| Item | Cost | Notes |
|---|---|---|
| Apple Developer Program | $99/yr | Required for App Store |
| Google Play Developer | $25 one-time | Required for Play Store |
| Supabase Pro | $25/mo | Already on this plan |
| Vercel Pro | $20/mo | Already on this plan |
| Domain + branding | $200 | One-time |
| Legal (privacy policy, ToS) | $500 | One-time (can use template services) |
| **Total startup:** | **~$900** | |
| **Monthly burn (pre-revenue):** | **~$50** | Just infrastructure |

This is remarkably low because the product is already built. The transformation work is engineering time, not capital.

### 7.2 Break-Even Analysis

**Monthly fixed costs:** ~$50 (infrastructure) + ~$0.60/active user (AI)
**Revenue per paying user:** $2.99/mo
**Contribution margin per paying user:** $2.39/mo (after AI costs)

**Break-even point:** 21 paying users (to cover $50 infra)
**Meaningful revenue (covers your time at $5K/mo):** 2,100 paying users (~21,000 MAU at 10% conversion)

### 7.3 3-Year P&L Projection

| | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| **Revenue** | $45,000 | $324,000 | $1,500,000 |
| Infrastructure | ($2,400) | ($8,400) | ($24,000) |
| AI API costs | ($9,000) | ($64,800) | ($300,000) |
| Marketing | ($6,000) | ($24,000) | ($60,000) |
| Apple/Google cut (15-30%) | ($6,750) | ($48,600) | ($225,000) |
| **Net profit** | **$20,850** | **$178,200** | **$891,000** |
| **Margin** | **46%** | **55%** | **59%** |

Note: Apple takes 30% in year 1, dropping to 15% under the Small Business Program (revenue < $1M). Year 3 assumes a blend.

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI API costs spike | Medium | High | Model fallback chain (Haiku for basic, Sonnet for premium). Cache repeated prompts. Batch processing. |
| Low retention (journaling fatigue) | High | High | AI lore is the hook — make it delightful. Push notifications for nudges. Weekly digest creates habit loop. |
| Apple App Store rejection | Low | High | No NSFW content, privacy-compliant. Follow App Store guidelines strictly. |
| Competitor copies the concept | Medium | Medium | First-mover advantage in AI+camera+journal combo. Brand and aesthetic are defensible. |
| API rate limits at scale | Low | Medium | Queue system for AI generation. Graceful degradation (text-only if vision fails). |
| Privacy/GDPR compliance | Medium | High | Data stored in EU region (Supabase supports this). Clear consent flows. Data export/deletion tools. |

---

## 9. Competitive Moat

1. **AI prompt engineering** — months of refinement on narrative voice, type-specific directives, weather/mood/time awareness. This is institutional knowledge that's hard to replicate.

2. **Aesthetic system** — the gold/obsidian design language, overlay styles, template system. Cohesive brand identity that feels premium.

3. **Feature density** — camera + journal + AI + relationship graph + travel intelligence + export studio. A competitor would need to build all of these to match the value proposition.

4. **Network effects** — group chronicles become more valuable with more entries and participants. Switching cost increases over time (your entire history is here).

5. **Content library** — the AI lore, passport stamps, and achievement system create a personalized content library that users don't want to lose.

---

## 10. Team & Execution

**Current:** Solo developer with full-stack capability (React, TypeScript, Supabase, AI integration). The entire product was built by one person — proof of execution speed and technical range.

**Hiring plan (funded scenario):**
- Month 3: Part-time designer (brand consistency, marketing assets)
- Month 6: Part-time marketing (TikTok content, ASO, community)
- Month 12: Full-time mobile developer (native iOS/Android features)

**Bootstrap scenario (no funding):**
- Continue solo development
- Use AI tools for marketing content generation
- Revenue-funded growth from month 6+
- Hire first when MRR exceeds $10K

---

## 11. Exit Scenarios

| Scenario | Timeline | Valuation Range |
|---|---|---|
| Lifestyle business (solo, profitable) | Ongoing | $0 (but $100K+/yr profit) |
| Acqui-hire by VSCO/Snap/Meta | Year 2-3 | $2-5M |
| VC-funded growth → acquisition | Year 3-5 | $10-50M (at 10-20x ARR) |
| VC-funded growth → IPO pathway | Year 5+ | $100M+ (Polarsteps trajectory) |

**Most likely path:** Bootstrap to $500K ARR, then either remain a profitable lifestyle business or raise a seed round ($1-3M) to accelerate into the travel/social journaling space.

**Comparable acquisitions:**
- BeReal acquired for $537M (40M MAU, minimal revenue)
- VSCO valued at ~$500M (200M signups, $24M revenue)
- Polarsteps: $10M revenue, 18M users, bootstrapped, profitable

---

## 12. Next Steps

1. **Decide positioning:** Momento-first (camera app) vs Codex (full platform). Recommendation: Momento-first.
2. **Build landing page + waitlist** — 2 days of work. Start collecting emails immediately.
3. **Start TikTok content** — 3x/week demos of the existing product. Zero cost, high potential.
4. **Multi-tenant migration** — 8-week engineering sprint (see Phase 1 roadmap).
5. **TestFlight beta** — invite 50 people from waitlist for feedback.
6. **App Store submission** — target launch 10 weeks from start.
7. **Product Hunt launch** — coordinate with initial content push.

---

## 13. AI Agent Operations — Minimum-Effort Autonomous Business

### 13.1 Philosophy

The goal: run a profitable app business with ~2-3 hours of human effort per week. Everything else is handled by a fleet of specialized AI agents. You make decisions; agents execute.

**Your role:** Creative director + final approver. You record raw videos, approve content, make product calls, and check numbers. That's it.

### 13.2 The Agent Stack

#### Agent 1: Content Factory (Daily, autonomous)

**Purpose:** Generate and schedule all social media content across TikTok, Instagram, and Twitter/X.

**Tools:** Claude Agent SDK + MCP connections to Buffer/Later + Canva API + Supabase Storage (for pulling real app screenshots and lore samples)

**How it works:**
- Every day, pulls recent Momento screenshots, lore samples, and mind map visuals from Supabase storage
- Generates 3 pieces of content: 1 TikTok/Reel script, 1 carousel post, 1 story
- Formats each for platform specs (9:16 for TikTok, 4:5 for Instagram, 1:1 for Twitter)
- Writes captions with trending hashtags (queries TikTok Creative Center API for current trends)
- Schedules posts via Buffer API
- Sends a daily Slack/Telegram notification: "3 posts queued for tomorrow. Approve or edit."

**Content themes on weekly rotation:**
| Day | Theme | Content type |
|---|---|---|
| Monday | "AI wrote this about my dinner" | Lore showcase (before/after) |
| Tuesday | "POV: your camera but cinematic" | Momento overlay comparison reel |
| Wednesday | "This app knows who my real friends are" | Mind map reveal video |
| Thursday | "How we document trips now" | Mission intelligence demo |
| Friday | "New overlay dropped" | Feature teaser |
| Weekend | User-generated reposts / community highlights | Engagement |

**Your input:** Record 2-3 raw 30-second phone videos per week showing features. Agent handles editing, captions, formatting, and scheduling.

**Monthly cost:** ~$30 (Claude API + Buffer $6/mo + Canva API free tier)

#### Agent 2: Code Shipping (On-demand)

**Purpose:** Implement features, fix bugs, and deploy — triggered by plain-English instructions.

**Tools:** Claude Code (current setup) + GitHub Actions

**How it works:**
- You create a GitHub Issue in plain English: "Add a new Momento overlay called Vintage with sepia borders and handwritten font"
- Agent picks up the issue, writes code, type-checks, commits, pushes, verifies deploy
- You test on your phone, respond "ship it" or "the font is too small"
- Agent iterates until approved, then closes the issue

**Pipeline:** GitHub Issues → Claude Code webhook → implementation → PR → auto-deploy on merge

**This is already operational** — it's the workflow used throughout this conversation. The systematization step is adding a GitHub webhook trigger so you don't need to open a terminal.

**Monthly cost:** $0 (already included in Claude Code subscription)

#### Agent 3: ASO (App Store Optimization) Agent (Weekly)

**Purpose:** Optimize App Store/Play Store listing for maximum organic discovery.

**Tools:** Claude API + App Store Connect API + keyword tracking

**How it works:**
- Monitors keyword rankings weekly (scrapes search results for target keywords)
- Generates 5 keyword variants for app subtitle and description
- A/B tests screenshots (generates new variants from Studio templates via Puppeteer/html2canvas)
- Tracks competitor rankings (VSCO, Day One, BeReal, Polarsteps)
- Sends weekly report: "Ranking #47 for 'AI journal' (up 12). Suggested: swap 'photo diary' for 'camera journal'. Approve?"

**Your input:** Approve or reject keyword/screenshot changes once per week (5 minutes).

**Monthly cost:** ~$10 (Claude API)

#### Agent 4: Community Manager (Always-on)

**Purpose:** Run Discord/community server, handle support, surface insights.

**Tools:** Claude Agent SDK + MCP for Discord + Supabase

**How it works:**
- Answers user questions ("How do I use the mind map?" → links to relevant guide)
- Flags bugs from user reports → auto-creates GitHub Issues with reproduction steps
- Highlights feature requests with sentiment analysis → weekly digest
- Sends personalized onboarding DMs to new users with tips based on their first actions
- Moderates (removes spam, enforces community guidelines)
- Escalates only genuinely complex issues to you

**Your input:** Review weekly community digest (10 minutes). Respond to high-value conversations occasionally.

**Monthly cost:** ~$20 (Claude API + Discord bot hosting)

#### Agent 5: Analytics & Intelligence (Daily)

**Purpose:** Track all metrics, detect anomalies, generate insights without you opening a dashboard.

**Tools:** Claude API + Supabase direct queries + Vercel Analytics API

**How it works:**
- Runs daily queries: new signups, DAU/MAU, entries created, AI generations used, conversion rate, churn rate, revenue
- Compares to previous day/week/month baselines
- Detects anomalies: "Signups up 340% today — traced to a TikTok post going viral. Here's which one."
- Generates a daily dashboard card sent to Telegram/Slack
- Weekly: produces a "metrics memo" with trends, cohort analysis, and suggested actions
- Monthly: generates investor-ready metrics summary (if fundraising)

**Your input:** Glance at the daily card (2 minutes). Read weekly memo (10 minutes).

**Monthly cost:** ~$5 (Claude API, Supabase queries are free on Pro plan)

#### Agent 6: Email & Lifecycle (Automated)

**Purpose:** Automated email sequences for onboarding, retention, re-engagement, and announcements.

**Tools:** Resend or Loops (email delivery) + Claude for copywriting

**Sequences:**
| Trigger | Email | Timing |
|---|---|---|
| New signup | Welcome + "Here's how to take your first Momento" | Immediate |
| Day 3, no entry | "Your chronicle is empty — here's inspiration" | Day 3 |
| Day 7, active | "Your first week: here's your chronicle stats" | Day 7 |
| Day 14, no return | "We miss you — here's what's new" | Day 14 |
| New feature shipped | "Just dropped: [feature name]" | On deploy |
| Weekly (active users) | "Your weekly chronicle" — lore previews + stats | Every Monday |
| Subscription lapsed | "Your Premium expired — here's what you're missing" | On expiry |

**All copy generated by Claude** in the app's brand voice (noir/sophisticated). You approve templates once during setup, then the system runs autonomously.

**Monthly cost:** ~$25 (Resend $20/mo for 50K emails + Claude API)

### 13.3 The Daily Routine

**Morning — 5 minutes:**
- Check Telegram bot: "3 posts queued | 18 new signups | 1 bug flagged (minor)"
- Tap "Approve" on posts (or edit one caption)
- Bug flagged as minor → agent already created the GitHub Issue

**Evening — 15 minutes:**
- Record a quick 30-second raw phone video showing a feature
- Review any pending code changes from the shipping agent
- Glance at the analytics card

**Weekly — 1 hour:**
- Review ASO report, approve/reject keyword changes
- Read community digest, star 2-3 feature requests for next sprint
- Review metrics memo
- Record 1-2 longer demo videos if content pipeline needs fresh raw material

**Total weekly time: 2-3 hours**

### 13.4 Agent Costs Summary

| Agent | Function | Monthly cost |
|---|---|---|
| Content Factory | Social media content generation + scheduling | $30 |
| Code Shipping | Feature development + bug fixes + deployment | $0 (existing) |
| ASO | App Store keyword optimization + screenshot testing | $10 |
| Community Manager | Discord support + bug triage + onboarding | $20 |
| Analytics | Daily metrics + anomaly detection + reports | $5 |
| Email Lifecycle | Onboarding + retention + re-engagement emails | $25 |
| **Total** | | **$90/mo** |

For context: a single part-time marketing intern costs $1,500-2,500/mo. This agent fleet does more work, runs 24/7, never calls in sick, and costs $90.

### 13.5 What You Must Still Do (Irreplaceable Human Tasks)

1. **Record raw video** — Agents can edit and format, but the authentic "look at this cool thing" energy needs to come from a real person. 2-3 videos per week, 30 seconds each, shot on your phone. No editing needed.

2. **Make product decisions** — "Should we add this feature?" / "Is this overlay good?" / "Should we raise the price?" These are judgment calls that require taste and vision.

3. **Approve content** — Final eye on anything that goes public. Takes 5 minutes but prevents brand-damaging mistakes.

4. **High-value relationships** — If a journalist, influencer, or investor reaches out, you handle it. Agent flags these for you.

5. **Strategic pivots** — If a feature takes off unexpectedly or the market shifts, you decide the response. Agent provides the data; you make the call.

### 13.6 Build Order

| Week | Agent | Why first |
|---|---|---|
| 1 | Content Factory | Highest ROI — consistent posting starts the growth flywheel |
| 2 | Analytics | Know your numbers from day one without manual dashboards |
| 3 | Community Manager | As users arrive from content, they need support |
| 4 | Email Lifecycle | Automate retention before churn becomes a problem |
| Post-launch | ASO | Optimize once you're on the App Store |
| Ongoing | Code Shipping | Already operational, systematize with GitHub webhook |

### 13.7 Scaling the Agent Fleet

As revenue grows, the agent stack expands:

**At $5K MRR:**
- Add a **PR Agent** — monitors tech blogs, drafts and pitches press releases, personalizes outreach to journalists
- Add a **Competitor Watch Agent** — tracks VSCO/BeReal/Day One feature releases, suggests responses

**At $20K MRR:**
- Add a **Localization Agent** — translates app strings, generates localized ASO copy and marketing content for top 5 markets
- Add an **Ad Optimization Agent** — manages $500/mo TikTok Spark Ads budget, pauses underperformers, scales winners

**At $50K MRR:**
- Add an **Investor Relations Agent** — generates monthly investor updates, tracks milestones against fundraising targets
- Add a **Partnership Agent** — identifies potential brand collaborators, drafts partnership proposals, manages outreach sequences

---

## Sources

- [Digital Journal Apps Market Size & Growth](https://www.futuremarketinsights.com/reports/digital-journal-apps-market) — $5.7B market, 11.5% CAGR
- [VSCO Profitability — 200M Users, 160K Pro Subs](https://petapixel.com/2024/05/20/vsco-is-now-profitable-thanks-to-200-million-users-and-160000-pro-subs/) — $24M/yr revenue
- [BeReal Statistics 2026 — 40M MAU](https://www.businessofapps.com/data/bereal-statistics/) — acquired for $537M
- [Locket Growth — 9M DAU, Profitable](https://techcrunch.com/2025/08/06/photo-sharing-app-locket-is-banking-on-a-new-celebrity-focused-feature-to-fuel-its-growth/)
- [Polarsteps — 18M Users, $10M Revenue](https://www.startuprad.io/post/polarsteps-growth-privacy-first-travel-app-at-18m-users-startuprad-io/) — bootstrapped, profitable
- [LLM API Pricing 2026](https://www.tldl.io/resources/llm-api-pricing-2026) — Claude Sonnet $3/$15 per M tokens
- [Indie App Marketing Strategies 2025](https://indieappsanta.com/2025/11/21/10349/) — low-cost growth playbook
- [App Marketing on TikTok](https://splitmetrics.com/blog/intro-to-app-marketing-on-tiktok-hook-entertain-analyze-optimize/) — organic growth strategy
- [PhotoAI — $132K Monthly Revenue](https://ppc.land/how-one-photo-ai-app-generates-132k-monthly-after-70-failed-startups/) — indie AI photo app benchmark
- [Journal App Market Report 2033](https://www.businessresearchinsights.com/market-reports/journal-app-market-120441) — market projections
- [AI Agents for Content Creation 2026](https://noimosai.com/en/blog/the-ultimate-guide-to-ai-agents-for-content-creation-scale-your-marketing-autonomously-in-2026) — 80% reduction in marketing overhead
- [Best AI Agents for Marketing 2026](https://www.tofuhq.com/post/best-ai-agents-for-marketing) — multi-agent systems outperform single-agent by 90.2%
- [Claude Agent SDK — Building Agents](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) — production-ready autonomous workflows
- [AI Marketing Agents — Autonomous Content Ops](https://www.averi.ai/how-to/ai-agent-marketing-how-autonomous-ai-is-changing-content-ops-in-2026) — Action AI in marketing
