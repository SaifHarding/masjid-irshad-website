# 🕌 Masjid Irshad – Website & Community Platform

A modern, resilient, and mobile-first website and community platform built for **Masjid Irshad (Luton)**.

Designed to serve worshippers, students, and administrators with live prayer times, announcements, education programmes, secure registrations, and real-time broadcasts — all with a strong focus on reliability, accessibility, and performance.

---

## 🌟 Overview

This repository contains the full codebase for the Masjid Irshad digital platform.

Key goals:
- Accurate, reliable prayer times with fallbacks
- Clear communication via announcements and notifications
- Secure, user-friendly registration flows
- Excellent mobile and accessibility support
- Graceful degradation when external services fail

The platform integrates with multiple external services while using caching, fallbacks, and defensive UI patterns to remain functional even in partial-failure scenarios.

---

## 🧩 Core Features

### 🕰️ Prayer Times
- Live prayer timetable (Begins & Iqamah)
- **Next Prayer** countdown timer
- **Active Prayer Highlighting**: Current prayer visually highlighted in real-time
- Hijri date display

**Special times supported:**
- Ishraq
- Zawaal
- Sunrise / Sunset

**Data resilience:**
- Primary database source
- External API fallback
- `localStorage` caching for offline reliability

---

### 📅 Prayer Calendar
- Full monthly calendar view with all prayer times
- **Month & Year Navigation**: Browse any month with dropdown selectors
- **1-Click PDF Download**: Generate beautifully formatted PDF with:
  - Complete month's prayer timetable
  - Mosque branding and contact information
  - QR code linking to website
  - Quranic verse and Jumu'ah times
  - Print-optimized layout
- **Mobile Print Prompt**: Guided print dialog for mobile users
- **Visual Highlights**:
  - Current day indicator
  - Friday (Jumu'ah) highlighting
  - Responsive mobile-first design

**PDF Generation Tools:**
- `jsPDF` - PDF document creation
- `jspdf-autotable` - Table generation and formatting
- `qrcode` - QR code generation
- `date-fns` - Date formatting and manipulation
- `arabic-reshaper` - Arabic text rendering support

---

### 📢 Announcements & Events
- Auto-rotating events carousel (external API)
- Supports:
  - Image-based event cards
  - Text-only announcements
  - PDF file attachments
  - Event details with dates and times
- **Image Fullscreen Viewer**: Click any event image to view in fullscreen modal
- **Add to Calendar**: One-tap button to save events to your device calendar
- Floating announcement notification bubble

---

### 🔤 Accessibility – Text Resize
- Text resize toggle cycles through:
  - Regular → Large → X-Large
- Button label updates dynamically:
  - `A`, `A+`, `A++`
- User preference persisted via `localStorage`

---

### 🌓 Dark/Light Theme
- **Manual Toggle**: Sun/Moon icon in header for instant theme switching
- **Automatic Prayer-Based Switching**:
  - Dark mode automatically activated between Maghrib and Sunrise + 1 hour
  - Seamlessly adapts to prayer schedule
- Theme preference persisted across sessions
- Smooth transitions between modes

---

### 🔴 eMasjid Live Integration
- Fully embedded **eMasjidLive** audio player
- Supports:
  - Live Azaan
  - Bayaans
  - Other live broadcasts

#### Live Status Indicator

* Animated **🔴 Live** indicator shown in the header when broadcasting
* **Offline** indicator shown when no broadcast is active
* Clicking either **Live** or **Offline** scrolls the user directly to the eMasjidLive section on the homepage

#### Persistent Mini Player

* Continues playing audio while navigating between pages
* Minimised player bar stays visible across the site

#### Share & Social

* **Share Button**: Share the live stream link via native device share sheet
* **Platform-Aware Actions**: Detects iOS / Android for platform-specific behaviour
* **Subscriber Count**: Displays the number of active push notification subscribers

#### Embed Behaviour

* Automatically matches:

  * Light / dark mode
  * Website colour scheme
* Shows a clear offline message when no broadcast is active
* No broken or empty embeds

---

### 🔔 Push Notifications

#### Prayer Notifications

* **Adhan (Begin) Alerts**: Notified when each prayer's begin time is reached
* **Iqamah Alerts**: Notified when iqamah time is reached (e.g., "Fajr Iqamah has started")
* **Jumu'ah Handling**: Special messaging for Friday prayers (1st & 2nd Jumu'ah)
* **Maghrib**: Treated as immediate — begin time equals iqamah

#### Taraweeh Notifications (Ramadan)

* **Automatic Ramadan Detection**: Checks the current Hijri date for month 9
* **Timed Trigger**: Fires 20 minutes after Isha Jamaat each night
* **Once-Per-Night**: Deduplication ensures only one notification per evening
* **Contextual Message**: "Taraweeh has begun — tap to join the live recitation"

#### Live Broadcast Alerts

* Get notified when the masjid goes live on eMasjidLive
* Prayer-aware messages based on current prayer time

#### Event & Announcement Alerts

* **Pre-Event Alerts**: Notifications sent 20 minutes before an event starts
* **New Announcement Alerts**: Real-time notifications when new announcements are published

#### Notification Preferences

* **Granular Controls**: Toggle individual notification types on or off:
  - Begin times (Adhan)
  - Iqamah times
  - Announcements
  - Events
* **Permission Management**: Graceful handling of browser notification permissions

#### Reliability

* **Server-Side Deduplication**: `prayer_notification_log` table prevents duplicate notifications
* **5-Minute Cooldown**: Prevents notification spam between closely timed events
* **Service Worker Support**: Background notifications even when the app is closed

---

### 📱 Progressive Web App (PWA)

* **Installable**: Add to home screen on iOS, Android, and desktop
* **Dedicated Install Page**: Step-by-step instructions for each platform
* **Offline Support**: Service worker caching for critical resources
* **App-like Experience**: Standalone display mode, custom icons, and splash screens

---

## 📚 Education & Programmes

| Programme | Description |
|---------|-------------|
| **Maktab** | Multi-step, multi-child registration (ages 4–16) with T&Cs |
| **Hifdh al-Qur'an** | Separate flows for under-18s and adults (18+) |
| **Alimiyyah Programme** | Dedicated pages for boys and girls with curriculum details |
| **Student Portal** | External link for existing students |

* **Student Enrollment Count**: Live student count displayed on programme pages

---

## 📝 Registration & Forms

### 🧒 Maktab Registration (Multi-Step)

**Step 1**
- Primary parent / guardian details
- Email & phone number
- UK address lookup

**Step 2**
- Add 1–6 children
- Date of birth validation
- Gender & year group
- Medical notes
- Ethnic origin

**Step 3**
- Secondary parent / guardian (conditional)
- Terms & conditions agreement

**Additional features**
- UK address auto-complete
- CAPTCHA protection on all steps

---

### 📖 Hifdh Registration
- Separate flows for:
  - Under-18s (guardian details required)
  - Adults (18+)
- Automatic email confirmations

---

## 💬 Communication Tools

- **Contact Form**
  - General enquiries
  - Automatic confirmation emails
- **Ask the Imam**
  - Private question submission via FAQ page
- **Feedback & Bug Reports**
  - Feature requests
  - Issue reporting

---

## 🔧 Technical & Platform Features

* Cloudflare Turnstile CAPTCHA on all forms
* UK Address Lookup API integration
* Responsive, mobile-first design
* Email notifications via Resend API
* Google Sheets logging for registration submissions
* Local caching and graceful fallbacks for critical data

### 🛡️ Rate Limiting

All forms are protected with rate limiting to prevent abuse:

* **Limit**: 3 requests per hour per email address
* **Scope**: Contact form, Feedback form, Ask the Imam, and all registration forms
* **User Feedback**: Clear countdown timer showing when submissions will be available again
* **Implementation**: Server-side enforcement with client-side UI feedback

---

## 🧰 Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- React Router DOM
- React Query
- React Hook Form + Zod
- Framer Motion (via Tailwind Animate)
- `next-themes` (light / dark mode)

### Backend
- Supabase Edge Functions (Deno runtime)

### External Integrations

* eMasjid API (prayer time fallback)
* Resend API (transactional emails)
* Cloudflare Turnstile (bot protection)
* getAddress.io (UK address lookup)
* External Supabase project (events & announcements)

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and configure the following:

| Variable                        | Description                              |
| ------------------------------- | ---------------------------------------- |
| `VITE_SUPABASE_URL`             | Main Supabase project URL                |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Main Supabase anon/public key            |
| `VITE_PRAYER_SUPABASE_URL`      | Prayer times Supabase project URL        |
| `VITE_PRAYER_SUPABASE_ANON_KEY` | Prayer times Supabase anon key           |
| `VITE_TURNSTILE_SITE_KEY`       | Cloudflare Turnstile site key for CAPTCHA |
