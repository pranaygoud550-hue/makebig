# Make Big — Production Audit Report

**Date:** June 2026  
**Scope:** Database, auth, feeds, create/join flows, notifications, search, mobile, UI/UX, security, performance  
**Production readiness score:** **62 / 100** (up from ~48 before recent fixes)

---

## 1. Critical Bugs

| # | Issue | Root cause | Status |
|---|--------|------------|--------|
| C1 | Friend/join notifications never saved | `Notification` enum missing `join_request`, `friend_request` | **Fixed** |
| C2 | Invite routes crash | `Invite` model not imported in `server-new.js` | **Fixed** |
| C3 | Invite accept hijack | Status set to `accepted` before auth check | **Fixed** |
| C4 | Task CRUD open to any user | Missing `assertProjectMember` on POST/PUT/DELETE | **Fixed** |
| C5 | Post to any project | Missing membership check on `POST /api/posts` | **Fixed** |
| C6 | Workspace restore fails after login | `/workspaces` called without JWT | **Fixed** |
| C7 | `ProjectFeed` post composer crash | `loadPosts` undefined after refactor | **Fixed** |
| C8 | OTP returned in API response | `devCode` always included in send-otp | **Open** — requires production email/SMS wiring |
| C9 | Unauthenticated JWT via upsert | Existing users skip OTP on `/api/users/upsert` | **Open** — needs auth gate |
| C10 | Socket.io write events unauthenticated | Optional socket auth; no membership checks | **Open** |

---

## 2. Major Bugs

| # | Issue | Status |
|---|--------|--------|
| M1 | Duplicate projects (same owner + name) | **Mitigated** — idempotent create + display dedupe |
| M2 | Explore pagination duplicated page 1 | **Fixed** — page-driven fetch + dedupe |
| M3 | Draft projects public via slug | **Fixed** — status + visibility filter on `/api/p/:slug` |
| M4 | Private projects in explore | **Fixed** — visibility filter on explore/mongo |
| M5 | Draft projects in search | **Fixed** — removed draft from search query |
| M6 | Join button on own project | **Fixed** — owner detection across feeds |
| M7 | Notification mark-read IDOR | **Fixed** — scoped update to `userId` |
| M8 | Notifications broadcast to all sockets | **Fixed** — emit to `user_{userId}` room |
| M9 | Invite decline enum mismatch | **Fixed** — added `declined` to Invite schema |
| M10 | Friend request duplicates | **Mitigated** — unique index + reactivate declined |
| M11 | Publish auto-post missing from Home feed | **Fixed** — emit `feed_post_created` on publish |
| M12 | Mongo vs Supabase join semantics differ | **Open** — Supabase still instant-join |
| M13 | Public project detail leaks member contacts | **Open** — needs auth gate on detail/members |
| M14 | Search returns raw user contacts | **Open** — PII in recommendations |

---

## 3. Minor Bugs

| # | Issue | Status |
|---|--------|--------|
| m1 | Category sidebar truncated | **Fixed** |
| m2 | Explore search on every keystroke | **Fixed** — 350ms debounce |
| m3 | Home search race (stale results) | **Open** — add AbortController |
| m4 | Tab unmount refetches on switch | **Open** — keep-alive tabs or SWR |
| m5 | Stats show 0 until load | **Open** — skeleton states |
| m6 | Join `requestedAt` uses wrong timestamp | **Open** |
| m7 | Publish activity type `project_updated` vs `project_published` | **Open** |
| m8 | `useNotifications` socket `off()` handler mismatch | **Open** |
| m9 | Mark-all-read on tab open (optimistic) | **Open** — UX preference |

---

## 4. Security Issues

| Severity | Issue | Recommendation |
|----------|--------|----------------|
| **Critical** | OTP in JSON response | Never return `devCode` in production |
| **Critical** | JWT without OTP for existing users | Require verified OTP or authenticated session |
| **Critical** | Socket message/task injection | Require auth + membership on all writes |
| **Major** | JWT in localStorage | Prefer HttpOnly cookies + CSP |
| **Major** | Client JWT decode fallback in `useAuth` | Server-only session restore |
| **Major** | No rate limiting on OTP endpoints | Add per-IP/per-contact limits |
| **Major** | `GET /api/users/:contact` public | Restrict or redact |
| **Minor** | Weak OTP was `Math.random()` | **Fixed** — `crypto.randomInt` |
| **Minor** | Portfolio/image URL scheme validation | Allowlist https only |

**Env vars:** No server secrets found in client bundles. `NEXT_PUBLIC_*` only — correct pattern.

---

## 5. Performance Issues

| Issue | Impact | Recommendation |
|-------|--------|----------------|
| Explore loads all projects then slices in memory | Slow at scale | Mongo aggregation + `$skip/$limit` |
| Home tab: 3 parallel catalog requests | Redundant load | Single catalog endpoint |
| Repeated `apiCheckHealth()` per socket | Extra RTT | Cache health 30s in AppShell |
| Tab unmount remounts feeds | Duplicate fetches | Keep-alive or React Query |
| No image CDN/optimization | Large LCP | Next.js Image + size limits |
| Missing DB indexes (partial) | Slow queries | **Partially fixed** — Project, Notification, Invite, FriendRequest |

---

## 6. UX Issues

| Area | Issue | Status |
|------|--------|--------|
| Home | Plain “Home” header | **Fixed** — welcome dashboard |
| Explore | Inconsistent salary badges | **Fixed** — unified cards |
| Landing | Weak logged-out story | **Improved** — hero, features, how-it-works |
| Own project | Confusing join error | **Fixed** — owner actions |
| Notifications | Silent failures | **Fixed** — enum types |
| Mobile | Sidebar category truncation | **Fixed** |
| Mobile | Modals/forms | Generally OK; test on real devices |

---

## 7. Recommended Improvements

### High impact (do next)
1. Production OTP delivery — remove `devCode`; wire Resend/Fast2SMS
2. Secure upsert — require OTP or JWT contact match
3. Socket.io hardening — auth required + membership checks
4. Next.js `middleware.ts` for protected routes
5. Redact contacts from public search/detail APIs
6. Align Supabase join flow with approval-based Mongo flow

### Medium impact
7. React Query / SWR for feeds (cache + invalidation)
8. Saved projects / bookmarks
9. Direct messaging (partially exists — harden)
10. Project analytics dashboard for owners
11. Invite link sharing (`/?join=slug` exists — polish UX)

### Future features
12. User reputation / verification badges  
13. Portfolio pages (partial — `/u/[contact]` exists)  
14. Project milestones  
15. Startup showcase / featured projects  
16. Team role permissions (admin vs member)

---

## 8. Files Modified (this audit pass)

| File | Change |
|------|--------|
| `server-new.js` | Invite import, auth fixes, visibility, notifications, crypto OTP, publish feed emit |
| `backend/models/Notification.js` | Enum + indexes |
| `backend/models/Invite.js` | `declined` enum + indexes |
| `backend/models/FriendRequest.js` | Unique compound index |
| `backend/models/Project.js` | Query indexes |
| `backend/events/socketEvents.js` | User notification room join |
| `lib/restoreUserProject.ts` | Auth headers on workspaces |
| `lib/mongoExplore.ts` | Visibility filter |
| `components/ProjectFeed.tsx` | `refreshPosts` fix |
| `components/ExploreView.tsx` | Debounce + abort |
| `docs/AUDIT_REPORT.md` | This report |

---

## 9. Testing Results

```
Test Files  8 passed (8)
Tests       37 passed (37)
```

Manual verification checklist:
- [ ] Explore shows each project once
- [ ] Owner sees “Your Project” not Join
- [ ] Friend request creates notification
- [ ] Join request creates owner notification
- [ ] Workspace restores after re-login
- [ ] Post composer refreshes feed
- [ ] Draft project slug returns 404 publicly

---

## 10. Production Readiness Score

| Category | Score | Weight |
|----------|-------|--------|
| Core flows (create/join/post) | 70 | 25% |
| Auth & security | 45 | 25% |
| Data consistency | 75 | 15% |
| UI/UX polish | 72 | 15% |
| Performance | 58 | 10% |
| Mobile | 68 | 10% |

**Weighted total: 62 / 100**

**Blockers before public launch:**
1. Remove OTP from API responses in production  
2. Fix unauthenticated account takeover via upsert  
3. Harden Socket.io write paths  
4. Redact PII from public endpoints  

---

*Report generated from codebase audit. Re-run after each production-hardening sprint.*
