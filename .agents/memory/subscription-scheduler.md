---
name: Subscription Expiry Scheduler
description: Background scheduler that detects expiring/expired subscriptions and sends email + in-app notifications
---

## Rule
`artifacts/api-server/src/lib/subscription-scheduler.ts` runs hourly via `setInterval` started in `index.ts`. It:
1. Marks `active` subscriptions past their `endDate` as `expired`, sends email + in-app notification
2. Sends expiry warnings at 7, 3, and 1 day(s) before `endDate` via a ±1-hour window

**Why:** There was no proactive notification system; users only found out on page load (lazy-expiry). The mailer has templates `subscription-expiry-warning` and `subscription-expired` added during this session.

**How to apply:** The scheduler starts automatically on server boot. Email templates are in `mailer.ts`. To add more warning days, edit the `WARN_DAYS` array in `subscription-scheduler.ts`.
