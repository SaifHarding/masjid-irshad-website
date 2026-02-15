# Security Scan Report — Masjid Irshad Website

**Date:** 14 February 2026  
**Scope:** Full codebase — frontend (`src/`), backend (`supabase/functions/`), configuration, dependencies, PWA  
**Tool:** Manual static analysis + `npm audit`

---

## Executive Summary

The scan identified **27 unique findings** across the codebase, including **4 Critical**, **8 High**, **8 Medium**, **4 Low**, and **3 Informational** issues. The most pressing concerns are **hardcoded API credentials in source code**, **SSRF vulnerabilities in Edge Functions**, **wildcard CORS on all endpoints**, and **known vulnerabilities in npm dependencies**.

| Severity | Count | Action Required |
|----------|-------|-----------------|
| CRITICAL | 4 | Immediate remediation |
| HIGH | 8 | Fix within 1-2 weeks |
| MEDIUM | 8 | Plan fixes |
| LOW | 4 | Address when convenient |
| INFO | 3 | Good practices noted |

---

## CRITICAL Findings

### C1. Hardcoded Supabase Anon Keys in Source Code

**Severity:** CRITICAL  
**CVSS estimate:** 7.5 (High)  
**Files affected:**
- `src/lib/backendClient.ts:17-21`
- `src/hooks/usePrayerTimes.ts:79-80`
- `src/hooks/useMonthlyPrayerTimes.ts:7-8`
- `supabase/functions/check-live-and-notify/index.ts:14-15`
- `supabase/functions/check-live-and-notify/test-prayer-times.ts:4-6`

**Description:**  
Supabase anonymous keys (JWTs) and project URLs are hardcoded directly in source files as fallback values. These are real credentials embedded in the repository and bundled into the client-side JavaScript.

**Code example:**
```typescript
// src/hooks/usePrayerTimes.ts
const prayerSupabaseUrl = import.meta.env.VITE_PRAYER_SUPABASE_URL || 'https://twlkumpbwplusfqhgchw.supabase.co';
const prayerSupabaseKey = import.meta.env.VITE_PRAYER_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Impact:**  
- Keys exposed to anyone with repository access (or in the browser bundle)
- Enables unauthorized API calls to both Supabase projects
- If RLS policies are weak, data exfiltration is possible

**Recommendation:**
1. Remove all hardcoded fallback values immediately
2. Require environment variables; fail gracefully if missing
3. Add build-time validation that env vars are set
4. Rotate all exposed keys after fix

---

### C2. Server-Side Request Forgery (SSRF) in Push Notification Endpoint

**Severity:** CRITICAL  
**CVSS estimate:** 8.6 (High)  
**File:** `supabase/functions/send-push-notification/index.ts:234-250`

**Description:**  
The `subscription.endpoint` from user-provided push subscriptions is used directly in a server-side `fetch()` call with no validation. An attacker can register a subscription with an arbitrary endpoint URL.

**Code example:**
```typescript
const endpointUrl = new URL(subscription.endpoint);
const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
const response = await fetch(subscription.endpoint, { ... });
```

**Impact:**
- Can target internal services (localhost, private IPs, cloud metadata endpoints like `169.254.169.254`)
- Can be used to port-scan internal networks
- Can exfiltrate data to attacker-controlled servers

**Recommendation:**
1. Validate endpoints against an allowlist of known push service domains:
   - `fcm.googleapis.com`
   - `updates.push.services.mozilla.com`
   - `*.notify.windows.com`
   - `*.push.apple.com`
2. Block private/reserved IP ranges
3. Add URL scheme validation (must be HTTPS)

---

### C3. Server-Side Request Forgery (SSRF) via Station Parameter

**Severity:** CRITICAL  
**CVSS estimate:** 7.2 (High)  
**File:** `supabase/functions/emasjid-live-status/index.ts:17,56`

**Description:**  
The `station` query parameter is used directly in URL construction without validation, enabling path traversal or SSRF.

**Code example:**
```typescript
let station = url.searchParams.get('station');
const miniplayerUrl = `https://emasjidlive.co.uk/miniplayer/${station}`;
```

**Impact:**
- Path traversal via crafted station values (e.g., `../../admin`)
- Potential SSRF if combined with redirect following

**Recommendation:**
1. Validate `station` against an explicit allowlist (e.g., `['masjidirshad']`)
2. Or sanitize to alphanumeric characters only: `/^[a-zA-Z0-9-]+$/`

---

### C4. Known Vulnerabilities in npm Dependencies

**Severity:** CRITICAL (aggregate)  
**Source:** `npm audit`

**Vulnerable packages:**

| Package | Severity | Issue |
|---------|----------|-------|
| `jspdf` ≤4.0.0 | **High** | PDF Injection allowing arbitrary JavaScript execution (GHSA-pqxr-3g65-p328) |
| `jspdf` ≤4.0.0 | **High** | DoS via unvalidated BMP dimensions (GHSA-95fx-jjr5-f39c) |
| `jspdf` ≤4.0.0 | **Moderate** | Stored XMP metadata injection (GHSA-vm32-vv63-w422) |
| `jspdf` ≤4.0.0 | **Moderate** | Shared state race condition (GHSA-cjw8-79x6-5cj4) |
| `glob` 10.2.0-10.4.5 | **High** | Command injection via CLI (GHSA-5j98-mcp5-4vw2) |
| `esbuild` ≤0.24.2 | **Moderate** | Dev server request hijacking (GHSA-67mh-4wv8-2f99) |
| `js-yaml` 4.0.0-4.1.0 | **Moderate** | Prototype pollution via merge (GHSA-mh29-5h37-fv8m) |

**Recommendation:**
1. Run `npm audit fix` immediately
2. For `jspdf`, upgrade to latest patched version (or evaluate alternatives)
3. Set up automated dependency scanning in CI/CD (e.g., Dependabot, Snyk)

---

## HIGH Findings

### H1. Wildcard CORS on All Edge Functions

**Severity:** HIGH  
**Files:** All files under `supabase/functions/`

**Description:**  
Every Edge Function uses `Access-Control-Allow-Origin: "*"`, allowing any website to make API calls to these endpoints.

**Code example:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Impact:**
- Any malicious website can call registration, feedback, and push subscription endpoints
- Enables cross-site abuse of rate-limited resources
- Combined with missing authentication, significantly increases attack surface

**Recommendation:**
```typescript
const allowedOrigins = ['https://masjidirshad.co.uk', 'https://www.masjidirshad.co.uk'];
const origin = req.headers.get('origin');
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

---

### H2. All Edge Functions Have JWT Verification Disabled

**Severity:** HIGH  
**File:** `supabase/config.toml`

**Description:**  
Every function has `verify_jwt = false`, meaning no authentication is required to call any endpoint.

**Impact:**
- Any unauthenticated user/bot can invoke all endpoints
- Registration, feedback, contact, and push notification functions are fully open
- Increases effectiveness of abuse and DoS attacks

**Recommendation:**
- Enable JWT verification for sensitive endpoints
- For public endpoints, add alternative authentication (API key headers, Turnstile verification)

---

### H3. Missing Content Security Policy (CSP)

**Severity:** HIGH  
**File:** `index.html`

**Description:**  
No Content Security Policy is configured via meta tag or HTTP headers.

**Impact:**
- No browser-enforced protection against XSS, code injection, or data exfiltration
- Inline scripts and third-party scripts can execute without restriction

**Recommendation:**  
Add a CSP meta tag to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co https://api.getaddress.io https://api.aladhan.com;
  frame-src https://*.emasjidlive.com https://challenges.cloudflare.com;
">
```

---

### H4. Service Worker Accepts Untrusted Push Data Without Validation

**Severity:** HIGH  
**File:** `public/sw.js:33-42`

**Description:**  
Push notification payloads are parsed and spread into the notification data without any validation or sanitization.

**Code example:**
```javascript
if (event.data) {
  try {
    const pushData = event.data.json();
    data = { ...data, ...pushData }; // No validation
  } catch (e) {
    data.body = event.data.text(); // Direct text injection
  }
}
```

**Impact:**
- Malicious push payloads could inject misleading content
- Could redirect users to phishing URLs via notification click handlers
- Could override notification action URLs

**Recommendation:**
```javascript
const pushData = event.data.json();
data.title = typeof pushData.title === 'string' ? pushData.title.substring(0, 100) : 'Masjid Irshad';
data.body = typeof pushData.body === 'string' ? pushData.body.substring(0, 200) : '';
if (pushData.data?.url && pushData.data.url.startsWith('/')) {
  data.data.url = pushData.data.url;
}
```

---

### H5. In-Memory Rate Limiting Resets on Cold Start

**Severity:** HIGH  
**Files:**
- `supabase/functions/send-feedback/index.ts:29-52`
- `supabase/functions/send-contact-confirmation/index.ts:33-56`
- `supabase/functions/send-program-registration/index.ts:43-66`
- `supabase/functions/send-imam-query/index.ts`

**Description:**  
Rate limiting uses JavaScript `Map` objects which reset whenever the Edge Function cold-starts.

**Code example:**
```typescript
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
```

**Impact:**
- Rate limits are fully bypassed after any cold start
- Serverless functions frequently cold-start, especially under low traffic
- Enables spam abuse of registration, feedback, and contact forms

**Recommendation:**
- Use a persistent store (Supabase table, Redis, or KV store) for rate limit counters
- Alternative: Use Supabase's built-in rate limiting features

---

### H6. IP Spoofing Vulnerability in Rate Limiting

**Severity:** HIGH  
**Files:** Multiple Edge Functions with rate limiting

**Description:**  
Client IP is extracted from spoofable HTTP headers without validation.

**Code example:**
```typescript
function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
}
```

**Impact:**
- Attackers can set arbitrary `X-Forwarded-For` headers to bypass per-IP rate limits
- Each request can appear to come from a different IP

**Recommendation:**
- Trust only the header set by your edge proxy (e.g., `cf-connecting-ip` for Cloudflare)
- Or use the last entry in `X-Forwarded-For` if behind a known proxy chain

---

### H7. Verbose Error Messages Expose Internals

**Severity:** HIGH  
**Files:** Multiple Edge Functions

**Description:**  
Full error messages (including stack traces and internal paths) are returned to clients.

**Code example:**
```typescript
return new Response(JSON.stringify({ error: error.message }), {
  status: 500,
  headers: corsHeaders,
});
```

**Impact:**
- Reveals internal file paths, dependency names, database errors
- Aids attackers in crafting targeted exploits

**Recommendation:**
```typescript
console.error('Registration error:', error); // Log full details server-side
return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
  status: 500,
  headers: corsHeaders,
});
```

---

### H8. Missing Input Validation on Registration Forwarding

**Severity:** HIGH  
**Files:**
- `supabase/functions/register-student/index.ts:75-88`
- `supabase/functions/register-hifz-student/index.ts`

**Description:**  
Registration data from the client is forwarded to an external Supabase project without server-side validation.

**Code example:**
```typescript
const body = await req.json();
// No validation...
const response = await fetch('https://kqezxvivoddnqmylsuwd.supabase.co/functions/v1/register-student', {
  body: JSON.stringify(body),
});
```

**Impact:**
- Malformed or malicious data forwarded to external API
- Potential injection in downstream processing
- No guarantee of data integrity

**Recommendation:**
- Add Zod schema validation before forwarding
- Validate all required fields, types, and ranges

---

## MEDIUM Findings

### M1. Missing iframe Sandbox Attributes

**Severity:** MEDIUM  
**Files:**
- `src/components/MasjidLiveEmbed.tsx:443`
- `src/pages/Contact.tsx:225`

**Description:**  
Iframes for eMasjidLive and Google Maps lack `sandbox` attributes.

**Recommendation:**  
Add `sandbox="allow-scripts allow-same-origin"` with only necessary permissions.

---

### M2. Sensitive Data in localStorage Without Encryption

**Severity:** MEDIUM  
**Files:** Multiple hooks (`usePushSubscription.ts`, `usePrayerTimes.ts`, `useEventNotifications.ts`)

**Description:**  
Push subscription state, prayer times cache, and notification data stored in plaintext localStorage.

**Recommendation:**
- Encrypt sensitive data before storing
- Validate and sanitize cached data on read
- Use sessionStorage for temporary data

---

### M3. Personal Email Addresses Hardcoded in Source

**Severity:** MEDIUM  
**File:** `supabase/functions/send-feedback/index.ts:110,161`

**Description:**  
Personal email addresses (`saif.harding@outlook.com`, `afnan.chaudary576@gmail.com`) are hardcoded in source code.

**Recommendation:**
- Move to environment variables (e.g., `FEEDBACK_RECIPIENT_EMAILS`)
- Avoid exposing personal emails in version-controlled code

---

### M4. Missing Request Size Limits on Edge Functions

**Severity:** MEDIUM  
**Files:** All Edge Functions accepting JSON payloads

**Description:**  
No size limits on request bodies before JSON parsing.

**Recommendation:**
```typescript
const contentLength = parseInt(req.headers.get('content-length') || '0');
if (contentLength > 100000) { // 100KB limit
  return new Response(JSON.stringify({ error: 'Request too large' }), { status: 413 });
}
```

---

### M5. Missing Content-Type Validation

**Severity:** MEDIUM  
**Files:** All Edge Functions

**Description:**  
No validation that incoming requests have `Content-Type: application/json` before parsing.

---

### M6. Missing Timeout on Some External API Calls

**Severity:** MEDIUM  
**Files:** Various Edge Functions

**Description:**  
Some external fetch calls lack timeout via `AbortController`, risking hung connections.

---

### M7. `.env.production` Not Explicitly in `.gitignore`

**Severity:** MEDIUM  
**File:** `.gitignore`

**Description:**  
While `.env` and `.env.local` are excluded, `.env.production` is not explicitly listed.

**Recommendation:**  
Add to `.gitignore`:
```
.env.production
.env.development
```

---

### M8. Hardcoded External Supabase URLs

**Severity:** MEDIUM  
**Files:**
- `supabase/functions/register-student/index.ts:88`
- `supabase/functions/register-hifz-student/index.ts:124`
- `src/hooks/usePublicEvents.ts:21`

**Description:**  
External API URLs hardcoded rather than using environment variables.

---

## LOW Findings

### L1. Console.log Statements in Production Code

**Severity:** LOW  
**Files:** Multiple files across `src/` and `supabase/functions/`

**Description:**  
Extensive `console.log` and `console.error` statements may leak sensitive data in production.

**Recommendation:**
- Use a structured logging library with log levels
- Remove sensitive data from log messages
- Strip debug logs in production builds

---

### L2. Static Service Worker Cache Name

**Severity:** LOW  
**File:** `public/sw.js:4`

**Description:**  
Cache name is `masjid-irshad-v1` with no build-time versioning.

**Recommendation:**  
Use build-time versioning for cache invalidation.

---

### L3. Missing CSRF Protection

**Severity:** LOW  
**Files:** All public endpoints

**Description:**  
No CSRF tokens implemented. Partially mitigated by Turnstile on forms.

---

### L4. Missing Security Headers

**Severity:** LOW  
**Files:** All Edge Function responses

**Description:**  
Missing standard security headers in responses.

**Recommendation:**  
Add to all responses:
```typescript
"X-Content-Type-Options": "nosniff",
"X-Frame-Options": "DENY",
"Referrer-Policy": "strict-origin-when-cross-origin",
"X-XSS-Protection": "0" // Deprecated but harmless
```

---

## Informational (Positive Findings)

### I1. No XSS via dangerouslySetInnerHTML
No instances of `dangerouslySetInnerHTML`, `innerHTML`, `eval()`, or `new Function()` found.

### I2. Source Maps Disabled in Production
`vite.config.ts` correctly sets `sourcemap: false` for production builds.

### I3. HTML Escaping in Email Templates
Edge Functions consistently use `escapeHtml()` to sanitize user input before embedding in emails.

### I4. VAPID Keys Properly Managed
VAPID public and private keys are stored in environment variables, not hardcoded.

### I5. Third-Party API Keys Secured
Resend, Cloudflare Turnstile, and getAddress.io keys are loaded from environment variables.

---

## Remediation Priority Matrix

### Immediate (Week 1)
| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| C1 | Remove hardcoded API keys | Low | Critical |
| C2 | Validate push subscription endpoints | Medium | Critical |
| C3 | Validate station parameter | Low | Critical |
| C4 | Run `npm audit fix` | Low | Critical |
| H7 | Sanitize error messages | Low | High |

### Short-Term (Weeks 2-3)
| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| H1 | Restrict CORS origins | Low | High |
| H2 | Enable JWT verification / add auth | Medium | High |
| H3 | Add Content Security Policy | Medium | High |
| H4 | Validate service worker push data | Low | High |
| H6 | Fix IP spoofing in rate limiting | Low | High |
| H8 | Add input validation schemas | Medium | High |

### Medium-Term (Weeks 3-4)
| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| H5 | Persistent rate limiting | High | High |
| M1 | Add iframe sandbox attributes | Low | Medium |
| M3 | Move personal emails to env vars | Low | Medium |
| M4 | Add request size limits | Low | Medium |
| M5 | Add Content-Type validation | Low | Medium |

### Long-Term
| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| L1 | Production logging strategy | Medium | Low |
| L4 | Add security response headers | Low | Low |
| M7 | Update .gitignore | Low | Medium |

---

## Recommended Security Enhancements

1. **Automated dependency scanning** — Add Dependabot or Snyk to CI/CD pipeline
2. **Secret scanning** — Enable GitHub secret scanning (or pre-commit hooks like `gitleaks`)
3. **Security headers** — Configure via hosting provider (Vercel, Cloudflare Pages, etc.)
4. **Penetration testing** — Schedule annual external pentest
5. **Incident response plan** — Document key rotation procedures for exposed credentials
6. **Subresource Integrity (SRI)** — Add integrity hashes for external scripts/stylesheets
7. **Rate limiting at edge** — Use Cloudflare/Vercel rate limiting in addition to application-level

---

*Report generated by static analysis of the Masjid Irshad website codebase.*  
*This is not a substitute for dynamic application security testing (DAST) or penetration testing.*
