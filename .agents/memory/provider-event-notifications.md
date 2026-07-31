---
name: Provider-owned property notifications
description: Property event handlers must resolve ownerUserId via providers table when the property belongs to a provider (ownerUserId is null).
---

## Rule
All property lifecycle event handlers (`onPropertyApproved`, `onPropertyRejected`, `onPropertyExpired`, `onPropertySubmitted`, `onPropertyUpdatedAfterRejection`, `onPropertyDeleted`) must use `resolvePropertyOwnerUserId(property)` — not `property.ownerUserId` directly.

**Why:** Provider-owned properties always have `ownerUserId = null` and `providerId` set. Using `ownerUserId` directly means no email or in-app notification is ever sent for provider-owned listings.

**How to apply:** The helper `resolvePropertyOwnerUserId` is defined in `lib/event-service.ts`. It falls back to `providersTable.userId` when `ownerUserId` is null. Any new event handler for property events must call it.
