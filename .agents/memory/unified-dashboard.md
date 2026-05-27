---
name: Unified Dashboard Architecture
description: How the shared user+provider dashboard is structured and how to extend it.
---

## Rule
All dashboard pages live under `/dashboard/*` and serve BOTH `user` and `provider` roles from a single component tree. Never create separate pages for the two roles.

**Why:** The user explicitly required that any UI change (button, card, section) added to a dashboard page automatically appears for both roles without editing twice.

## How to apply

### Adding a new dashboard page (shared for all roles)
1. Create `artifacts/marketplace/src/pages/dashboard/my-page.tsx`
2. Wrap with `<DashboardLayout>`
3. Use `const { isProvider, isUser, user, providerId } = useRole()` for role branching
4. Add to `SHARED_NAV` in `DashboardLayout.tsx` — one line, affects all roles

### Adding a provider-only nav item
Add to `PROVIDER_NAV` array in `DashboardLayout.tsx`.

### Adding a user-only nav item
Add to `USER_NAV` array in `DashboardLayout.tsx`.

### Role-based rendering inside a page
```tsx
const { isProvider, isUser } = useRole();

{isProvider && <ProviderOnlySection />}   // provider sees this
{isUser     && <UserOnlySection />}       // user sees this
// No guard = both roles see it
```

## Key files
- `src/lib/use-role.ts` — `useRole()` hook (single source of truth for role)
- `src/components/dashboard/DashboardStatCard.tsx` — shared stat card, change once → affects both
- `src/components/dashboard/DashboardHero.tsx` — shared hero banner with role-specific props
- `src/components/DashboardLayout.tsx` — sidebar with SHARED_NAV / PROVIDER_NAV / USER_NAV config
- `src/pages/dashboard/index.tsx` — overview page (shows role-specific DATA in shared components)

## Nav config pattern (DashboardLayout.tsx)
```ts
const SHARED_NAV = [/* all roles see these */];
const PROVIDER_NAV = [/* provider only */];
const USER_NAV = [/* user only */];
// buildNav(isProvider, unreadCount, msgUnread) merges them
```
