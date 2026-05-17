# دليل الخدمات — API Documentation

**Base URL:** `https://yourdomain.com/api`  
**Format:** All responses are JSON  
**Auth:** Bearer token via Laravel Sanctum (`Authorization: Bearer {token}`)

---

## Response Format

All endpoints return:
```json
{
  "success": true | false,
  "data": { ... } | [ ... ],
  "message": "optional string",
  "meta": { "total": 100, "current_page": 1, "last_page": 5 }
}
```

Error responses:
```json
{ "success": false, "message": "...", "errors": { "field": ["..."] } }
```

---

## Authentication

### POST /api/auth/register
Register a new user account.

**Body:**
```json
{
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "phone": "0501234567",
  "password": "Secret@123",
  "password_confirmation": "Secret@123"
}
```

**Response:** `201` — `{ success, data: { user, token } }`

---

### POST /api/auth/register/provider
Register a new provider account (status: pending, awaiting admin approval).

**Body:**
```json
{
  "name": "محمد العمري",
  "email": "provider@example.com",
  "phone": "0509876543",
  "password": "Secret@123",
  "password_confirmation": "Secret@123",
  "business_name": "شركة العمري للسباكة",
  "business_name_en": "Al-Omari Plumbing",
  "description": "وصف المنشأة...",
  "category_id": 1,
  "subcategory_id": 2,
  "region_id": 1,
  "city_id": 1,
  "area_id": 3,
  "address": "حي النزهة، الرياض",
  "latitude": 24.7136,
  "longitude": 46.6753
}
```

**Response:** `201` — `{ success, data: { user, provider, token } }`

---

### POST /api/auth/login
Login with email and password.

**Body:** `{ "email": "...", "password": "..." }`  
**Response:** `200` — `{ success, data: { user, token, provider? } }`

---

### POST /api/auth/logout *(auth required)*
Revoke current token.

**Response:** `200` — `{ success, message }`

---

### GET /api/auth/me *(auth required)*
Get current authenticated user profile.

**Response:** `{ success, data: { user, provider?, staff? } }`

---

### PUT /api/auth/profile *(auth required)*
Update user profile fields (name, phone, city).

---

### POST /api/auth/change-password *(auth required)*
**Body:** `{ "current_password": "...", "new_password": "...", "new_password_confirmation": "..." }`

---

## Providers

### GET /api/providers
List active providers with filters.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| category_id | int | Filter by category |
| subcategory_id | int | Filter by subcategory |
| region_id | int | Filter by region |
| city_id | int | Filter by city |
| area_id | int | Filter by area |
| search | string | Search business_name / description |
| featured | bool | Only featured providers |
| sort | string | `rating`, `newest`, `reviews` |
| per_page | int | Items per page (default 15) |

---

### GET /api/providers/{id}
Get a single provider with services.

---

### GET /api/providers/{id}/reviews
Get reviews for a provider.

---

### POST /api/providers/nearby
Find providers near a location using Haversine formula.

**Body:**
```json
{
  "latitude": 24.7136,
  "longitude": 46.6753,
  "radius": 20,
  "category_id": 1
}
```

---

### GET /api/provider/profile *(auth: provider)*
Get authenticated provider's own profile.

### PUT /api/provider/profile *(auth: provider)*
Update provider profile (business_name, description, phone, whatsapp, working_hours, etc.)

### GET /api/provider/stats *(auth: provider)*
Get dashboard statistics (requests, revenue, reviews, balance).

---

## Services

### GET /api/services
List services with filters.

**Query params:** `provider_id`, `category_id`, `subcategory_id`, `search`, `price_type`, `price_min`, `price_max`, `featured`, `per_page`

---

### GET /api/services/{id}
Get single service (increments views_count).

---

### POST /api/provider/services *(auth: provider)*
Create a new service.

**Body:**
```json
{
  "title": "تسليك مجاري",
  "description": "...",
  "price": 150,
  "price_type": "fixed",
  "price_unit": "للزيارة",
  "category_id": 1,
  "subcategory_id": 4
}
```
*Note: max services limited by package tier.*

---

### PUT /api/provider/services/{id} *(auth: provider)*
Update service fields.

### DELETE /api/provider/services/{id} *(auth: provider)*
Soft-delete (sets is_active = false).

---

## Service Requests

### GET /api/requests *(auth required)*
- User sees own requests
- Provider sees received requests
- Admin sees all requests

**Query params:** `status`, `provider_id`, `user_id`, `per_page`

---

### POST /api/requests *(auth required)*
Create a new service request.

**Body:**
```json
{
  "provider_id": 5,
  "service_id": 12,
  "title": "إصلاح تسرب مياه",
  "description": "...",
  "budget": 300,
  "scheduled_at": "2024-03-15T10:00:00",
  "address": "حي العليا، الرياض"
}
```

---

### GET /api/requests/{id} *(auth required)*
Get a single request (user sees own, provider sees received).

---

### PUT /api/requests/{id}/status *(auth required)*
Update request status.

**Body:**
```json
{
  "status": "accepted | rejected | in_progress | completed | cancelled",
  "rejection_reason": "optional reason",
  "final_price": 350
}
```
- Provider: can accept/reject/complete
- User: can cancel only
- On complete: provider balance credited automatically

---

## Reviews

### POST /api/reviews *(auth required)*
Submit a review.

**Body:**
```json
{
  "provider_id": 5,
  "service_request_id": 12,
  "rating": 5,
  "comment": "خدمة ممتازة!"
}
```
*Requires completed service request.*

---

### POST /api/provider/reviews/{id}/reply *(auth: provider)*
Reply to a review.

**Body:** `{ "reply": "شكراً لتقييمك الكريم" }`

---

## Categories

### GET /api/categories
List all active categories with subcategories.

### GET /api/categories/{id}
Get a category.

### GET /api/categories/{id}/subcategories
Get subcategories.

---

## Regions

### GET /api/regions
List all regions with cities.

### GET /api/regions/{regionId}/cities
List cities in a region.

### GET /api/cities/{cityId}/areas
List areas in a city.

---

## Packages

### GET /api/packages
List all active packages.

### GET /api/packages/{id}
Get a single package.

### POST /api/packages/{id}/subscribe *(auth: provider)*
Initiate subscription to a package.

**Body:** `{ "billing_cycle": "monthly | yearly" }`

---

## STC Pay

### POST /api/stcpay/subscription *(auth: provider)*
Initiate subscription payment.

**Body:** `{ "package_id": 2, "billing_cycle": "monthly" }`

**Response:**
```json
{
  "success": true,
  "data": {
    "payment_ref": "PAY-XXXXXXXXXX",
    "checkout_url": "https://...",
    "amount": 99,
    "test_mode": true
  }
}
```

---

### POST /api/stcpay/service-request *(auth required)*
Initiate payment for a service request.

**Body:** `{ "service_request_id": 15 }`

---

### GET /api/stcpay/status/{paymentRef} *(auth required)*
Check payment status.

**Response:** `{ payment_ref, status, amount, paid_at }`

---

### GET /api/stcpay/return
STC Pay redirect return URL (public). Activates subscription/payment on success.

### POST /api/stcpay/webhook
STC Pay webhook (public). Processes payment confirmations.

### GET /api/stcpay/simulator
**Test mode only.** In-browser STC Pay payment simulator.

---

## Notifications

### GET /api/notifications *(auth required)*
Get user notifications with unread count.

### POST /api/notifications/{id}/read *(auth required)*
Mark notification as read.

### POST /api/notifications/read-all *(auth required)*
Mark all as read.

### DELETE /api/notifications/{id} *(auth required)*

---

## Messages

### GET /api/messages/conversations *(auth required)*
Get conversation list with last message and unread count per conversation.

### GET /api/messages/{partnerId}/thread *(auth required)*
Get full message thread with a user. Marks their messages as read.

**Query:** `per_page` (default 50, ordered oldest-first)

### POST /api/messages *(auth required)*
Send a message.

**Body:** `{ "receiver_id": 7, "body": "السلام عليكم" }`

### DELETE /api/messages/{id} *(auth required)*
Delete own sent message.

---

## Favorites

### GET /api/favorites *(auth required)*
List user's favorite providers.

### POST /api/favorites/toggle *(auth required)*
Toggle favorite (add if not exists, remove if exists).

**Body:** `{ "provider_id": 5 }`

**Response:** `{ success, is_favorite: true|false }`

### GET /api/favorites/{providerId}/check *(auth required)*
Check if a provider is favorited.

---

## Support Tickets

### GET /api/support-tickets *(auth required)*
User sees own tickets. Admin sees all.

### POST /api/support-tickets *(auth required)*
Create a support ticket.

**Body:**
```json
{
  "subject": "مشكلة في الحساب",
  "body": "...",
  "priority": "medium",
  "category": "billing"
}
```

**Response:** `201` — Ticket with public_id like `TK-12345`

### GET /api/support-tickets/{id} *(auth required)*
Get ticket with replies.

### POST /api/support-tickets/{id}/reply *(auth required)*
Add a reply to a ticket.

**Body:** `{ "body": "..." }`

---

## File Upload

### POST /api/upload *(auth required)*
Upload a file.

**Form data:**
- `file` — The file (max 5MB)
- `type` — `avatar | banner | service | document | attachment`

**Response:** `{ path, url }`

### POST /api/upload/provider/{type} *(auth: provider)*
Upload provider avatar or banner. `type` = `avatar` or `banner`.

### POST /api/upload/service/{serviceId}/images *(auth: provider)*
Upload service images (multiple). Respects package image limit.

---

## Settings

### GET /api/settings
Get public site settings as key-value pairs.

---

---

# Admin Endpoints

All admin endpoints require `Authorization: Bearer {admin_token}` and admin/moderator role.

## GET /api/admin/stats
Dashboard statistics: users, providers, requests, revenue, subscriptions.

## GET /api/admin/payments
List all payments with filters (`status`, `type`, `from`, `to`).  
Add `?export=true` to download CSV.

## Provider Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/providers | List all providers |
| GET | /api/admin/providers/{id} | Provider details |
| PUT | /api/admin/providers/{id} | Update provider |
| POST | /api/admin/providers/{id}/approve | Approve provider |
| POST | /api/admin/providers/{id}/reject | Reject with reason |
| POST | /api/admin/providers/{id}/suspend | Suspend |
| POST | /api/admin/providers/{id}/featured | Toggle featured |

## User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/users | List users |
| GET | /api/admin/users/{id} | User details |
| POST | /api/admin/users/{id}/toggle-active | Activate/deactivate |

## Staff Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/admin/staff | Create moderator account |
| PUT | /api/admin/staff/{id} | Update permissions |
| DELETE | /api/admin/staff/{id} | Remove staff |

### Staff Permissions
Available permission strings:
- `manage_providers` — Approve/reject/suspend providers
- `manage_reviews` — Hide/show/delete reviews
- `manage_tickets` — Handle support tickets
- `view_payments` — View payment data
- `manage_categories` — CRUD categories
- `manage_settings` — Update site settings
- `all` — Super permissions (same as admin)

## Review Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/reviews | List reviews |
| POST | /api/admin/reviews/{id}/toggle-visibility | Hide/show |
| POST | /api/admin/reviews/{id}/toggle-approval | Approve/unapprove |
| DELETE | /api/admin/reviews/{id} | Delete review |

## Content Management

| Endpoint | Description |
|----------|-------------|
| POST /api/admin/categories | Create category |
| PUT /api/admin/categories/{id} | Update category |
| POST /api/admin/regions | Create region |
| POST /api/admin/cities | Create city |
| POST /api/admin/areas | Create area |
| POST /api/admin/packages | Create package |
| GET /api/admin/settings | All settings |
| POST /api/admin/settings | Bulk update settings |
| POST /api/admin/notifications/send | Send notification to user |

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 401 | Unauthenticated (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 422 | Validation error |
| 500 | Server error |
