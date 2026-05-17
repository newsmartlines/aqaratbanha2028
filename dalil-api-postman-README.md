# Dalil Services API — Postman Collection Guide
# دليل استخدام مجموعة Postman لـ API دليل الخدمات

---

## Quick Start (5 steps)

1. **Import the collection**
   - Open Postman → click **Import** → choose `dalil-api-postman-collection.json`

2. **Create an environment**
   - Postman → Environments → **New**
   - Name it: `Dalil Dev`
   - Add these variables:

   | Variable      | Initial Value                         | Notes                        |
   |---------------|---------------------------------------|------------------------------|
   | `base_url`    | `https://your-domain.com/api`         | Change to your actual domain |
   | `token`       | *(leave blank)*                       | Filled automatically on login |
   | `user_id`     | `1`                                   | Filled automatically on login |
   | `provider_id` | `1`                                   | Filled automatically on login |

3. **Select your environment** (top-right dropdown in Postman)

4. **Authenticate**
   - Open **🔑 Auth → Login**
   - Enter your credentials in the request body
   - Hit **Send**
   - The `token`, `user_id`, and `provider_id` variables are stored automatically via the Tests script

5. **Explore all endpoints** — every protected route picks up `{{token}}` automatically

---

## Collection Structure

| Folder | Endpoints |
|--------|-----------|
| 🔑 **Auth** | Register (user/provider), Login, Me, Logout, Forgot/Reset/Change Password, Become Provider |
| 👥 **Users** | List, Get, Update, Status, Delete, Favorites, Requests, Reviews |
| 🏢 **Providers** | List, Get, Nearby, Update, Stats, Interactions, Subscribe, Service Areas |
| 🗂️ **Categories** | CRUD + Subcategories CRUD |
| 🔧 **Services** | Provider service CRUD + Admin listings management |
| 📋 **Requests** | Create, List (admin/provider), Update status/notes |
| 💬 **Messages** | Inbox, Conversation, Send, Unread Count |
| ⭐ **Reviews** | List, Submit, Update, Reply, Delete |
| 📦 **Packages** | List, Create, Update, Delete |
| 💳 **Payments (STC Pay)** | Create session (subscription & service request), Status, Webhook |
| 🔔 **Notifications** | List, Unread count, Create, Mark read, Delete |
| 🎫 **Support Tickets** | List, Create, Update status |
| 🗺️ **Regions & Cities** | List regions (public), Areas by city |
| ⚙️ **Settings** | Get all, Get by key, Update (admin) |
| 📊 **Stats** | Platform stats, Health check |
| 📁 **File Upload** | Avatar, Banner, Service image |
| 🛡️ **Admin** | Providers, Companies, Categories, Services, Faults, Payments, Subscriptions, Regions, Cities, Areas, Staff |

---

## Authentication Flow

The API uses **cookie-based sessions** with an optional **Bearer token** in the `Authorization` header.

After login, the server responds with a `token` field and sets a `session` cookie.
Postman handles cookies automatically. For Bearer auth, the test script stores the token:

```javascript
// Runs automatically after Login / Register
const json = pm.response.json();
if (json.token) pm.collectionVariables.set('token', json.token);
if (json.data?.id) pm.collectionVariables.set('user_id', String(json.data.id));
if (json.data?.providerId) pm.collectionVariables.set('provider_id', String(json.data.providerId));
```

---

## Role-Based Access

| Endpoint prefix | Required role |
|-----------------|---------------|
| `/api/admin/*`  | `admin` or `moderator` with matching permission |
| `/api/auth/me`  | Any logged-in user |
| `/api/providers/:id` (PUT) | Owner provider or admin |
| `/api/users/:id` (PUT) | Own account or admin |
| `/api/stcpay/create-session` | `provider` role |
| Most GET endpoints | Public (no auth needed) |

---

## STC Pay Payment Flow

```
1. POST /api/stcpay/create-session      ← provider logs in, chooses paid package
   Response: { redirectUrl, refId }

2. User is redirected to STC Pay checkout page (redirectUrl)

3. STC Pay calls POST /api/stcpay/webhook (server-to-server)
   OR redirects user to GET /api/stcpay/return?refId=...&status=paid

4. GET /api/stcpay/status/:refId        ← frontend polls to confirm
   Response: { status: "paid" | "pending" | "failed" }
```

**Test mode** (`STCPAY_TEST_MODE=true`) simulates the checkout page internally — no real payment is processed.

---

## Common Response Shape

All endpoints return:

```json
{
  "success": true | false,
  "data": { ... } | [ ... ],
  "error": "Error message if success=false"
}
```

---

## Environment Variables Reference

| Variable | Description | Auto-set? |
|----------|-------------|-----------|
| `base_url` | API base URL (e.g., `https://yourdomain.com/api`) | ❌ Manual |
| `token` | Session token for Authorization header | ✅ Login/Register |
| `user_id` | Current user's ID | ✅ Login/Register |
| `provider_id` | Current provider's ID (if provider role) | ✅ Login (provider) |

---

## Tips

- **Admin login**: use the default admin credentials set during seeding (check `lib/db/seed.ts`)
- **File uploads**: use `form-data` body type in Postman — select the file via the file picker
- **Arabic content**: Postman fully supports UTF-8, so Arabic values in JSON bodies work as-is
- **Cookie auth**: Postman stores the `session` cookie automatically — no extra setup needed for cookie-based flows
- **Date filters**: use ISO format `YYYY-MM-DD` for `from`/`to` query params in admin payment endpoints
