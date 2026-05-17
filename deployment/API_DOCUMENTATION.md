# توثيق API — دليل الخدمات التجريبي

> **Base URL:** `https://yourdomain.com/api`
> **المصادقة:** يستخدم النظام Cookie (`session`) أو Header (`Authorization: Bearer <token>`)
> **صيغة الاستجابة:** جميع الردود بصيغة JSON: `{ success: true, data: ... }` أو `{ success: false, error: "..." }`

---

## 1. المصادقة (Auth)

### POST /api/auth/register
تسجيل حساب جديد (مستخدم عادي أو مزود خدمة).

**Body:**
```json
{
  "name": "محمد أحمد",
  "email": "user@example.com",
  "phone": "0500000000",
  "password": "123456",
  "role": "user",
  "regionId": 1,
  "cityId": 2
}
```
- `role`: `"user"` | `"provider"`

**Response:**
```json
{
  "success": true,
  "data": { "id": 1, "name": "...", "email": "...", "role": "user", "providerId": null },
  "token": "abc123..."
}
```

---

### POST /api/auth/login
تسجيل الدخول.

**Body:**
```json
{ "email": "user@example.com", "password": "123456" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1, "name": "...", "email": "...", "role": "user",
    "avatar": null, "providerId": null,
    "staffRole": null, "permissions": [], "isSuperAdmin": false
  },
  "token": "abc123..."
}
```

---

### POST /api/auth/logout
تسجيل الخروج (يحذف الجلسة).

**Response:** `{ "success": true }`

---

### GET /api/auth/me
جلب بيانات المستخدم الحالي (يحتاج تسجيل دخول).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1, "name": "...", "email": "...", "role": "user",
    "avatar": null, "phone": "...", "regionId": 1, "cityId": 2,
    "providerId": null, "permissions": [], "isSuperAdmin": false
  }
}
```

---

### POST /api/auth/become-provider
تحويل حساب مستخدم عادي إلى مزود خدمة.

**Headers:** `Authorization: Bearer <token>`

**Response:** `{ "success": true, "data": { ...userData, "providerId": 5 } }`

---

### POST /api/auth/forgot-password
طلب رابط إعادة تعيين كلمة المرور.

**Body:** `{ "email": "user@example.com" }`

---

### POST /api/auth/reset-password
إعادة تعيين كلمة المرور بالرمز المُرسل.

**Body:** `{ "token": "...", "password": "newpass123" }`

---

## 2. المستخدمون (Users)

### GET /api/users
جلب جميع المستخدمين (بدون المدراء).

**Response:** `{ "success": true, "data": [ { "id", "name", "email", "phone", "role", "avatar", "status", "createdAt" } ] }`

---

### GET /api/users/:id
جلب بيانات مستخدم محدد.

---

### PUT /api/users/:id
تعديل بيانات المستخدم.

**Body:**
```json
{
  "name": "اسم جديد",
  "phone": "0500000000",
  "avatar": "https://...",
  "regionId": 1,
  "cityId": 2
}
```

---

### PUT /api/users/:id/password
تغيير كلمة المرور.

**Body:** `{ "currentPassword": "...", "newPassword": "..." }`

---

### DELETE /api/users/:id
حذف حساب مستخدم.

---

## 3. مقدمو الخدمات (Providers)

### GET /api/providers
قائمة مقدمي الخدمات المعتمدين.

**Query Params:**
- `search` — بحث بالاسم أو النبذة
- `category` — رقم التصنيف
- `city` — اسم المدينة
- `featured` — `true` للبارزين فقط
- `regionId` — رقم المنطقة

**Response:**
```json
{
  "success": true,
  "data": [{
    "id", "bio", "avatar", "banner", "city", "district",
    "phone", "rating", "reviewsCount", "verified", "featured",
    "categoryId", "userName", "categoryNameAr", "latitude", "longitude"
  }]
}
```

---

### GET /api/providers/nearby
جلب مقدمي الخدمات القريبين من موقع المستخدم.

**Query Params:**
- `lat` — خط العرض (مطلوب)
- `lng` — خط الطول (مطلوب)
- `radius` — نطاق البحث بالكيلومتر (افتراضي: 5، أقصى: 200)
- `category` — رقم التصنيف (اختياري)

**Response:** مثل `/api/providers` + حقل `distanceKm`

---

### GET /api/providers/:id
جلب بيانات مزود خدمة محدد بالتفصيل.

---

### POST /api/providers/:id
تعديل ملف مزود الخدمة (يحتاج تسجيل دخول).

**Body:**
```json
{
  "bio": "...", "city": "الرياض", "district": "...",
  "phone": "...", "whatsapp": "...",
  "categoryId": 1, "latitude": 24.7, "longitude": 46.7,
  "logo": "https://...", "avatar": "https://...", "banner": "https://..."
}
```

---

## 4. الخدمات (Services)

### GET /api/providers/:providerId/services
جلب خدمات مزود خدمة محدد.

**Response:**
```json
{
  "success": true,
  "data": [{ "id", "title", "description", "price", "status", "img", "categoryId", "subcategory" }]
}
```

---

### POST /api/providers/:providerId/services
إضافة خدمة جديدة لمزود خدمة.

**Body:**
```json
{
  "title": "تنظيف منازل",
  "description": "...",
  "price": "150",
  "categoryId": 1,
  "subcategory": "تنظيف عميق",
  "img": "https://...",
  "status": "active"
}
```

---

### PUT /api/providers/:providerId/services/:id
تعديل خدمة.

---

### DELETE /api/providers/:providerId/services/:id
حذف خدمة.

---

## 5. الطلبات (Requests)

### POST /api/requests
إرسال طلب خدمة من مستخدم إلى مزود (يحتاج تسجيل دخول).

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "providerId": 3,
  "serviceId": 7,
  "note": "أحتاج الخدمة يوم الجمعة"
}
```

---

### GET /api/requests
جلب طلبات المستخدم الحالي أو مزود الخدمة.

**Query Params:** `userId` | `providerId`

---

### PATCH /api/requests/:id
تحديث حالة الطلب.

**Body:** `{ "status": "accepted" | "rejected" | "completed" | "cancelled" }`

---

## 6. التقييمات (Reviews)

### GET /api/providers/:providerId/reviews
جلب تقييمات مزود خدمة.

**Response:**
```json
{
  "success": true,
  "data": [{ "id", "rating", "text", "reply", "createdAt", "userId", "userName", "userAvatar" }]
}
```

---

### POST /api/providers/:providerId/reviews
إضافة تقييم جديد.

**Body:**
```json
{ "userId": 1, "rating": 5, "text": "خدمة ممتازة" }
```

---

### PATCH /api/providers/:providerId/reviews/:reviewId/reply
رد مزود الخدمة على تقييم.

**Body:** `{ "reply": "شكراً جزيلاً!" }`

---

## 7. المفضلة (Favorites)

### GET /api/users/:userId/favorites
جلب قائمة المفضلة للمستخدم.

---

### POST /api/users/:userId/favorites
إضافة مزود خدمة إلى المفضلة.

**Body:** `{ "providerId": 3 }`

---

### DELETE /api/users/:userId/favorites/:providerId
إزالة من المفضلة.

---

## 8. التصنيفات (Categories)

### GET /api/categories
جلب جميع التصنيفات.

**Response:**
```json
{
  "success": true,
  "data": [{ "id", "nameAr", "nameEn", "icon", "slug", "description", "image" }]
}
```

---

### GET /api/categories/:id
جلب تصنيف محدد.

---

### GET /api/categories/:id/subcategories
جلب التصنيفات الفرعية لتصنيف رئيسي.

---

## 9. المناطق والمدن (Regions & Cities)

### GET /api/regions
جلب جميع المناطق مع مدنها ومناطقها الفرعية.

**Response:**
```json
{
  "success": true,
  "data": [{
    "id", "nameAr", "nameEn", "enabled",
    "cities": [{ "id", "nameAr", "regionId", "areas": [...] }]
  }]
}
```

---

## 10. الرسائل (Messages)

### GET /api/messages/unread-count
عدد الرسائل غير المقروءة للمستخدم الحالي.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/messages/inbox
صندوق الوارد — قائمة المحادثات.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/messages/:otherId
جلب محادثة بين المستخدم الحالي ومستخدم آخر.

**Headers:** `Authorization: Bearer <token>`

---

### POST /api/messages
إرسال رسالة.

**Headers:** `Authorization: Bearer <token>`

**Body:** `{ "receiverId": 5, "content": "مرحباً" }`

---

### PATCH /api/messages/:conversationId/read
تحديد محادثة كمقروءة.

---

## 11. الإشعارات (Notifications)

### GET /api/notifications/unread-count
عدد الإشعارات غير المقروءة.

**Query Params:** `userId=1`

---

### GET /api/notifications
جلب الإشعارات.

**Query Params:** `userId=1`

---

### PATCH /api/notifications/:id/read
تحديد إشعار كمقروء.

---

### POST /api/notifications/mark-all-read
تحديد جميع الإشعارات كمقروءة.

---

## 12. الباقات (Packages)

### GET /api/packages
جلب جميع باقات الاشتراك.

**Response:**
```json
{
  "success": true,
  "data": [{
    "id", "nameAr", "nameEn", "price", "durationDays",
    "maxListings", "commissionRate", "featuredAllowed", "topBadge", "priorityRank"
  }]
}
```

---

## 13. الدفع عبر STC Pay

### POST /api/stcpay/initiate-subscription
بدء عملية دفع اشتراك.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{ "packageId": 2, "providerId": 3 }
```

**Response:**
```json
{
  "success": true,
  "data": { "paymentUrl": "https://stcpay.com.sa/...", "sessionId": "..." }
}
```

---

### POST /api/stcpay/initiate-request-payment
بدء عملية دفع طلب خدمة.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{ "providerId": 3, "serviceId": 7, "amount": 150, "note": "..." }
```

---

### GET /api/stcpay/callback
نقطة callback بعد إتمام الدفع (تستخدمها بوابة STC Pay).

---

## 14. تحميل الصور (Upload)

### POST /api/upload/avatar
رفع صورة شخصية.

**Form-data:** `file` (JPG/PNG/WEBP, max 5MB)

**Response:** `{ "success": true, "data": { "url": "/uploads/avatars/abc123.jpg" } }`

---

### POST /api/upload/banner
رفع صورة بانر مزود الخدمة.

---

### POST /api/upload/service
رفع صورة خدمة.

---

### POST /api/upload/logo
رفع شعار مزود الخدمة.

---

### POST /api/upload/settings-logo
رفع شعار الموقع (للمدير).

---

## 15. تذاكر الدعم (Support Tickets)

### GET /api/providers/:providerId/support-tickets
جلب تذاكر دعم مزود الخدمة.

**Headers:** `Authorization: Bearer <token>`

---

### POST /api/providers/:providerId/support-tickets
إنشاء تذكرة دعم جديدة.

**Body:**
```json
{
  "subject": "مشكلة في الدفع",
  "message": "...",
  "category": "Payment"
}
```
- `category`: `"Technical"` | `"Payment"` | `"Account"` | `"Other"`

---

### GET /api/providers/:providerId/support-tickets/:ticketId
جلب تفاصيل تذكرة محددة.

---

## 16. القوائم (Listings)

### GET /api/listings
جلب جميع الخدمات المنشورة (عامة).

**Response:** قائمة بجميع الخدمات مع اسم المزود والتصنيف.

---

### PATCH /api/listings/:id
تعديل حالة خدمة.

**Body:** `{ "status": "active" | "inactive" }`

---

## 17. الإحصائيات (Stats)

### GET /api/stats
إحصائيات عامة للموقع.

**Response:**
```json
{
  "success": true,
  "data": {
    "providers": 45,
    "users": 230,
    "services": 180,
    "requests": 500
  }
}
```

---

## 18. إعدادات الموقع (Settings)

### GET /api/settings
جلب إعدادات الموقع العامة.

**Response:**
```json
{
  "success": true,
  "data": {
    "siteName": "دليل الخدمات التجريبي",
    "siteNameEn": "Dalil Al-Khidmat",
    "logoUrl": "",
    "primaryColor": "#0d9488",
    "aboutContent": "...",
    "contactEmail": "info@dalel.sa",
    "contactPhone": "...",
    "contactWhatsapp": "...",
    "heroTitle": "...",
    "heroSubtitle": "...",
    "faqContent": "[...]"
  }
}
```

---

## 19. لوحة الإدارة (Admin) — يحتاج صلاحية admin

### GET /api/admin/sidebar-counts
أعداد الإشعارات في الشريط الجانبي.

**Response:**
```json
{
  "data": {
    "pendingProviders": 3,
    "suspendedUsers": 1,
    "pendingOrders": 7,
    "openTickets": 2
  }
}
```

---

### GET /api/admin/providers
قائمة جميع مزودي الخدمات (مع المعلقين والموقوفين).

### PATCH /api/admin/providers/:id/approve
اعتماد مزود خدمة.

### PATCH /api/admin/providers/:id/suspend
إيقاف مزود خدمة.

### GET /api/admin/users
قائمة المستخدمين للمدير.

### GET /api/admin/requests
جميع طلبات الخدمة.

### GET /api/admin/payments
سجل المدفوعات.

### GET /api/admin/stats
إحصائيات لوحة الإدارة.

### PUT /api/admin/settings
تعديل إعدادات الموقع.

---

## ملاحظات للمطور (Mobile App)

1. **المصادقة:** عند تسجيل الدخول يصل `token` في الاستجابة — احفظه وأرسله في كل طلب:
   ```
   Authorization: Bearer <token>
   ```

2. **الصور:** الصور المرفوعة تُحفظ كـ `/uploads/avatars/...` — أضف base URL:
   ```
   https://yourdomain.com/uploads/avatars/abc123.jpg
   ```

3. **ترتيب تدفق التطبيق:**
   - تسجيل/دخول → `/api/auth/register` أو `/api/auth/login`
   - جلب التصنيفات → `/api/categories`
   - جلب المزودين → `/api/providers?category=1&city=الرياض`
   - عرض مزود → `/api/providers/:id` + `/api/providers/:id/services`
   - إرسال طلب → `POST /api/requests`
   - متابعة الطلبات → `GET /api/requests?userId=1`

4. **أنواع الأدوار:**
   - `user` — مستخدم عادي
   - `provider` — مزود خدمة
   - `admin` — مدير
   - `moderator` — موظف إداري (صلاحيات محددة)
