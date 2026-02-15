# CLAUDE.md - Project Instructions for Claude Code

This file provides context and guidelines for Claude Code (Anthropic's CLI tool) when working on the Masjid Irshad website project.

---

## 1. Project Overview

**Masjid Irshad Website** - A modern, resilient community platform for a mosque in Luton, UK.

### Purpose
Serve worshippers with:
- Accurate prayer times with countdown timers
- Community announcements and event carousel
- Education programme information and registrations
- Live broadcast streaming and notifications
- Downloadable prayer calendars (PDF)

### Core Values
- **Reliability** - Prayer times must always be available (multiple fallbacks)
- **Accessibility** - Text resize, semantic HTML, keyboard navigation, screen reader support
- **Mobile-first** - Optimized for phone users attending the mosque
- **Graceful degradation** - Features degrade gracefully when APIs fail

---

## 2. Tech Stack & Architecture

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 + TypeScript | UI framework with type safety |
| Vite | Build tool and dev server |
| Tailwind CSS | Utility-first styling with custom theme |
| shadcn/ui | Component library (Radix primitives) |
| React Router v7 | Client-side routing |
| TanStack Query | Server state management & caching |
| React Hook Form + Zod | Form handling and validation |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase Edge Functions | Serverless backend (Deno runtime) |
| Supabase Database | PostgreSQL for live status cache, push subscriptions |
| External Prayer DB | Separate Supabase project for prayer times/events |

### PWA & Notifications
- Service Worker (`public/sw.js`) for push notifications
- VAPID-based Web Push for background notifications
- Cron job (`check-live-and-notify`) polls live status every minute

---

## 3. Key Features & Modules

### Prayer Times (`usePrayerTimes.ts`)
- **Primary**: External Supabase database (MasjidIrshadTimes table)
- **Fallback**: Aladhan API (coordinates for Luton)
- **Cache**: localStorage for offline access
- Active prayer highlighting in timetable
- Countdown to next iqamah/Jumu'ah
- Special Friday handling (1st/2nd Jumu'ah)

### Prayer Calendar PDF (`usePdfDownload.ts`)
- jsPDF + jspdf-autotable for generation
- Arabic text rendering via arabic-reshaper
- Amiri font embedded for Arabic support
- Single A4 page with teal/gold theme

### Events Carousel (`AnnouncementsSection.tsx`)
- Auto-rotating with embla-carousel
- Fullscreen image viewer on tap
- Floating announcement bubble
- Supports image cards and text-only items

### Live Broadcast (`MasjidLiveEmbed.tsx`, `useLiveStatus.ts`)
- eMasjidLive integration via iframe
- Live status polling (15s near prayer, 45s otherwise)
- Multi-method detection: API → Icecast → Miniplayer scraper
- Push notifications when stream goes live

### Push Notifications
- VAPID-based Web Push (works when browser closed)
- Prayer-aware messages ("Fajr Iqamah has started")
- 5-minute cooldown between notifications
- Special handling for Maghrib (begins = iqamah)
- Jumu'ah detection on Fridays

### Registration Forms
- **Maktab** (ages 5-12): Multi-step with parent/child info
- **Hifdh** (memorization): Similar flow with Quran proficiency
- All forms include:
  - Cloudflare Turnstile CAPTCHA
  - Rate limiting (3 submissions/hour per email)
  - getAddress.io UK postcode lookup
  - Google Sheets webhook logging
  - Email confirmations via Resend

### Theme System (`ThemeController.tsx`)
- Manual toggle (sun/moon icon in header)
- Automatic prayer-based switching:
  - Dark mode: Maghrib → Sunrise + 1 hour
  - Light mode: Rest of day
- Persisted in localStorage

### Accessibility
- Text resize (A, A+, A++) persisted in localStorage
- Semantic HTML throughout
- Keyboard navigation support
- Minimum 44px touch targets on mobile

---

## 4. Project Structure

```
├── src/
│   ├── pages/              # Route components (Index, FAQ, Maktab, etc.)
│   ├── components/         # Reusable UI components
│   │   └── ui/             # shadcn/ui primitives
│   ├── hooks/              # Custom React hooks
│   │   ├── usePrayerTimes.ts
│   │   ├── useLiveStatus.ts
│   │   ├── usePdfDownload.ts
│   │   └── ...
│   ├── lib/                # Utilities, API clients
│   │   ├── backendClient.ts
│   │   ├── pdf/            # PDF generation helpers
│   │   └── utils.ts
│   ├── integrations/
│   │   └── supabase/       # Auto-generated Supabase client
│   └── assets/             # Images, fonts
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   │   ├── check-live-and-notify/
│   │   ├── send-push-notification/
│   │   ├── register-student/
│   │   └── ...
│   └── config.toml         # Edge function config
├── public/
│   ├── sw.js               # Service Worker
│   └── manifest.json       # PWA manifest
└── CLAUDE.md               # This file
```

---

## 5. Development Guidelines

### TypeScript
```typescript
// ✅ Always use proper types
interface PrayerTimesData {
  Fajr_Begins: string;
  Fajr_Jamaat: string;
  // ...
}

// ❌ Avoid 'any'
const data: any = response; // Bad
```

### React Patterns
```typescript
// ✅ Use hooks and functional components
const PrayerTimes: React.FC = () => {
  const { data, isLoading, error } = usePrayerTimes();
  
  if (isLoading) return <Skeleton />;
  if (error) return <FallbackUI />;
  
  return <PrayerDisplay data={data} />;
};
```

### Data Fetching (TanStack Query)
```typescript
// ✅ Always handle loading and error states
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ["prayerTimes"],
  queryFn: fetchPrayerTimes,
  staleTime: 1000 * 60 * 60, // 1 hour
  retry: 2,
});
```

### Form Validation (Zod)
```typescript
const formSchema = z.object({
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^07\d{9}$/, "Must be UK mobile"),
  age: z.number().min(5).max(12),
});
```

### Error Handling
```typescript
// ✅ Always provide fallbacks
try {
  const data = await fetchFromAPI();
  return data;
} catch {
  // Try cache
  const cached = loadFromCache();
  if (cached) return cached;
  
  // Final fallback
  return getDefaultData();
}
```

### Mobile-First
```typescript
// ✅ Start with mobile, enhance for desktop
<div className="flex flex-col md:flex-row gap-4">
  <Card className="w-full md:w-1/2">
```

---

## 6. API & External Integrations

### Supabase Projects
| Project | Purpose | URL Variable |
|---------|---------|--------------|
| Main App | Live status cache, push subscriptions | `VITE_SUPABASE_URL` |
| Prayer Times | MasjidIrshadTimes, PublicEvents tables | Hardcoded in hooks |

### External APIs
| Service | Purpose | Secret Required |
|---------|---------|-----------------|
| eMasjidLive | Live broadcast status | No |
| Aladhan API | Prayer times fallback | No |
| Resend | Transactional emails | `RESEND_API_KEY` |
| Cloudflare Turnstile | Bot protection | `TURNSTILE_SECRET_KEY` |
| getAddress.io | UK postcode lookup | `GETADDRESS_API_KEY` |
| Google Sheets | Form submission logging | Webhook URLs |

---

## 7. Important Patterns

### Prayer Times Fallback Chain
```
Database (Primary)
    ↓ fail?
localStorage Cache (if same day)
    ↓ fail?
Aladhan API (calculated times)
    ↓ fail?
Error state with retry
```

### Theme Auto-Switching
```typescript
// Dark mode: Maghrib → Sunrise + 1 hour
const shouldBeDark = currentTime >= maghribTime || 
                     currentTime < sunriseTime + 60;
```

### Push Notification Flow
```
Cron Job (every minute)
    ↓
check-live-and-notify Edge Function
    ↓ stream went live?
Fetch prayer times → determine prayer name
    ↓
send-push-notification → all subscribers
    ↓
5-minute cooldown stored in live_status_cache
```

### Form Submission Flow
```
User fills form
    ↓
Turnstile CAPTCHA verification
    ↓
Rate limit check (3/hour per email)
    ↓
Submit to Edge Function
    ↓
Log to Google Sheets + Send confirmation email
```

---

## 8. Code Conventions

### File Naming
- **Components**: `PascalCase.tsx` (e.g., `PrayerTimes.tsx`)
- **Hooks**: `camelCase.ts` with `use` prefix (e.g., `usePrayerTimes.ts`)
- **Utilities**: `camelCase.ts` (e.g., `errorUtils.ts`)
- **Styles**: `kebab-case.css`

### Import Order
```typescript
// 1. React
import { useState, useEffect } from "react";

// 2. Third-party
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

// 3. Local components
import { Card } from "@/components/ui/card";
import { PrayerCard } from "@/components/PrayerCard";

// 4. Hooks
import { usePrayerTimes } from "@/hooks/usePrayerTimes";

// 5. Utilities
import { formatTime } from "@/lib/utils";

// 6. Types
import type { PrayerTimesData } from "@/types";
```

### Tailwind Classes
```typescript
// ✅ Use semantic design tokens
<div className="bg-background text-foreground">
<button className="bg-primary text-primary-foreground">

// ❌ Don't use raw colors
<div className="bg-white text-black">  // Bad - not themed
```

---

## 9. Testing & Deployment

### Development
```bash
npm run dev        # Start dev server (port 8080)
npm run build      # Production build
npm run build:dev  # Development build with source maps
```

### Testing Checklist
- [ ] Prayer times display correctly (check database vs API fallback)
- [ ] Countdown timer updates correctly
- [ ] Live status indicator works
- [ ] PDF download generates with Arabic text
- [ ] Forms validate and submit correctly
- [ ] Push notifications work (test with Supabase logs)
- [ ] Theme switching works (manual + automatic)
- [ ] Mobile responsive at 320px, 375px, 414px widths
- [ ] Text resize (A, A+, A++) works

### Deployment Notes
- Frontend: Click "Publish" in Lovable
- Edge Functions: Auto-deploy on code change
- Database migrations: Use Lovable migration tool

---

## 10. Important Context for AI Assistants

### Cultural Sensitivity
- This serves a **Muslim community** - be respectful of Islamic terminology
- Prayer times are **sacred** and must be accurate
- Use correct terms: Fajr, Dhuhr, Asr, Maghrib, Isha, Jumu'ah
- Friday prayer is "Jumu'ah" (not just "Friday prayer")

### Critical Reliability
- Prayer times must **never fail completely** - always have fallbacks
- Live notifications are **time-sensitive** (prayer starts soon)
- Cached data must be validated for current day

### Accessibility Priority
- Many users may be elderly or have visual impairments
- Text resize feature is essential
- Ensure screen reader compatibility
- Minimum 44px touch targets

### Performance Considerations
- Users may have low bandwidth (mosque WiFi congestion)
- Optimize images and bundle size
- Cache aggressively (prayer times, static content)
- Lazy load non-critical components

### Data Privacy
- Registration forms collect **personal data** (names, addresses, children's info)
- Never log sensitive data in production
- All emails sanitized against XSS before sending
- VAPID keys must never be exposed client-side

### Special Cases
- **Maghrib**: Begins and iqamah times are identical (prayed at sunset)
- **Jumu'ah**: Replaces Dhuhr on Fridays (1st and 2nd prayers)
- **Ramadan**: Times may change frequently - ensure data freshness
- **Arabic text in PDFs**: Requires reshaping and RTL reversal

### Edge Function Patterns
```typescript
// Always include CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle OPTIONS preflight
if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
}

// Use service role key for database writes
const supabase = createClient(url, serviceRoleKey);
```

---

## Quick Reference

### Common Hooks
| Hook | Purpose |
|------|---------|
| `usePrayerTimes()` | Fetch today's prayer times with fallbacks |
| `useLiveStatus()` | Poll eMasjidLive status |
| `usePdfDownload()` | Generate prayer calendar PDF |
| `useServiceWorker()` | Register SW for push notifications |
| `usePushSubscription()` | Manage push notification subscription |

### Key Components
| Component | Purpose |
|-----------|---------|
| `PrayerTimes` | Main prayer display with countdown |
| `MasjidLiveEmbed` | Live stream iframe + status badge |
| `AnnouncementsSection` | Event carousel with fullscreen viewer |
| `ThemeController` | Dark/light mode toggle |
| `Header` / `Footer` | Site navigation |

### Edge Functions
| Function | Trigger | Purpose |
|----------|---------|---------|
| `check-live-and-notify` | Cron (1 min) | Poll live status, send push |
| `send-push-notification` | HTTP POST | Dispatch to all subscribers |
| `push-subscribe` | HTTP POST | Register push subscription |
| `register-student` | HTTP POST | Maktab registration |
| `register-hifz-student` | HTTP POST | Hifdh registration |
| `verify-turnstile` | HTTP POST | CAPTCHA verification |

---

*Last updated: January 2026*
