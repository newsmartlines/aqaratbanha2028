# دليل رفع الموقع على cPanel
# دليل الخدمات التجريبي

---

## أولاً: ما تم بناؤه (التقنيات المستخدمة)

| الجزء | التقنية |
|-------|---------|
| الواجهة الأمامية (Frontend) | React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui |
| الواجهة الخلفية (Backend/API) | Node.js + Express + TypeScript |
| قاعدة البيانات | PostgreSQL |
| ORM (التعامل مع DB) | Drizzle ORM |
| المصادقة | Sessions (Cookie-based) + bcrypt |
| رفع الصور | Multer (تخزين محلي) |
| الدفع | STC Pay Integration |
| إدارة الحالة | TanStack Query (React Query) |
| التوجيه | Wouter |
| الخرائط | Haversine (حساب المسافات) |
| الرسوم المتحركة | Framer Motion |

---

## ثانياً: متطلبات الاستضافة

> ⚠️ **هام جداً:** هذا الموقع يعمل بـ **Node.js** و **PostgreSQL**.
> الاستضافة العادية (مشتركة) لا تكفي. تحتاج إلى:

### الحد الأدنى المطلوب:
- **Node.js 18+** (لتشغيل الـ Backend)
- **PostgreSQL 14+** (قاعدة البيانات)
- **cPanel مع دعم Node.js** (مثل: Hostinger Business, SiteGround, A2 Hosting)

### البديل الأسهل:
بدلاً من cPanel التقليدي، يُنصح بـ:
- **Railway.app** — يدعم Node.js + PostgreSQL مجاناً
- **Render.com** — يدعم كل شيء مجاناً
- **DigitalOcean App Platform**
- **VPS عادي** (Ubuntu) + PM2

---

## ثالثاً: محتويات مجلد dist

```
deployment/
├── frontend-dist/          ← ملفات الواجهة (HTML/CSS/JS)
│   ├── index.html
│   ├── assets/
│   └── ...
├── backend-dist/           ← ملفات الـ API (Node.js)
│   ├── index.mjs          ← نقطة دخول الـ API
│   └── ...
├── API_DOCUMENTATION.md   ← توثيق جميع الـ APIs
└── CPANEL_DEPLOYMENT_GUIDE.md ← هذا الملف
```

---

## رابعاً: خطوات الرفع على cPanel (مع دعم Node.js)

### الخطوة 1: إعداد قاعدة البيانات PostgreSQL

في cPanel → **PostgreSQL Databases:**
1. أنشئ قاعدة بيانات جديدة، مثلاً: `dalil_db`
2. أنشئ مستخدم جديد، مثلاً: `dalil_user` وكلمة مرور قوية
3. أضف المستخدم إلى قاعدة البيانات بصلاحية **كاملة**
4. احفظ هذه البيانات — ستحتاجها لاحقاً:

```
DB_NAME:     dalil_db
DB_USER:     dalil_user
DB_PASSWORD: YourStrongPassword
DB_HOST:     localhost
DB_PORT:     5432
```

**رابط الاتصال (DATABASE_URL):**
```
postgresql://dalil_user:YourStrongPassword@localhost:5432/dalil_db
```

---

### الخطوة 2: رفع الـ Backend (API Server)

1. في cPanel → **File Manager** → انتقل إلى `/home/youraccount/`
2. أنشئ مجلداً باسم `api`
3. ارفع محتويات مجلد `backend-dist/` داخل `/home/youraccount/api/`
4. ارفع أيضاً ملف `package.json` الخاص بالـ backend

**في cPanel → Setup Node.js App:**
1. اضغط **Create Application**
2. اختر الإصدار: **Node.js 18** أو أعلى
3. Application Mode: **Production**
4. Application Root: `/home/youraccount/api`
5. Application URL: `yourdomain.com/api` أو subdomain `api.yourdomain.com`
6. Application Startup File: `index.mjs`
7. اضغط **Create**

**إضافة متغيرات البيئة (Environment Variables):**
```
DATABASE_URL=postgresql://dalil_user:YourStrongPassword@localhost:5432/dalil_db
NODE_ENV=production
PORT=8080
SESSION_SECRET=your-random-secret-key-here-min-32-chars
```

---

### الخطوة 3: تهيئة قاعدة البيانات (إنشاء الجداول)

بعد رفع الـ Backend، اتصل بالسيرفر عبر SSH أو Terminal في cPanel:

```bash
cd /home/youraccount/api

# تشغيل migrations لإنشاء الجداول
node -e "
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
// أو استخدم أمر drizzle-kit push
"
```

> **ملاحظة:** الطريقة الأسهل هي نسخ قاعدة البيانات من Replit عبر pg_dump.

**نسخ قاعدة البيانات من Replit:**
```bash
# على Replit (في Terminal):
pg_dump $DATABASE_URL > backup.sql

# ثم ارفع backup.sql إلى السيرفر وشغّل:
psql -U dalil_user -d dalil_db -f backup.sql
```

---

### الخطوة 4: رفع الـ Frontend (الواجهة)

1. في cPanel → **File Manager** → انتقل إلى `public_html/`
2. ارفع جميع محتويات مجلد `frontend-dist/` داخل `public_html/`
3. تأكد أن `index.html` موجود في `public_html/`

**إعداد .htaccess لـ React Router:**
أنشئ ملف `.htaccess` في `public_html/` بهذا المحتوى:
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QR,L]
```

---

### الخطوة 5: ربط الـ Frontend بالـ API

إذا كان الـ API على subdomain مختلف (مثل `api.yourdomain.com`):

في ملف `frontend-dist/assets/index-*.js` (أو قبل البناء):
تأكد أن VITE_API_URL مضبوط على عنوان الـ API الصحيح.

---

### الخطوة 6: إعداد HTTPS وSSL

في cPanel → **SSL/TLS** → فعّل **Let's Encrypt** للدومين والـ subdomain.

---

## خامساً: التحقق من عمل الموقع

افتح المتصفح واختبر:

```
GET https://api.yourdomain.com/api/health
→ { "success": true, "status": "ok" }

GET https://api.yourdomain.com/api/settings
→ { "success": true, "data": { "siteName": "دليل الخدمات التجريبي", ... } }

GET https://yourdomain.com
→ يظهر الموقع
```

---

## سادساً: الدخول الافتراضي للمدير

```
البريد الإلكتروني: admin@dalel.sa
كلمة المرور:      admin123
```

> ⚠️ غيّر كلمة مرور المدير فوراً بعد أول تسجيل دخول!

---

## سابعاً: نصائح مهمة

1. **الجلسات** تُحفظ في الذاكرة (RAM) — في حالة إعادة تشغيل السيرفر ستُفقد الجلسات، وسيحتاج المستخدمون لإعادة تسجيل الدخول.
2. **الصور المرفوعة** تُحفظ في مجلد `uploads/` على السيرفر — تأكد من إعداد مجلد ثابت وعدم حذفه.
3. **النسخ الاحتياطية** — اعمل نسخة احتياطية لقاعدة البيانات دورياً:
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   ```

---

## ثامناً: بدائل أسهل للنشر

| المنصة | المميزات | التكلفة |
|--------|----------|---------|
| **Railway.app** | Node.js + PostgreSQL تلقائي | مجاني/مدفوع |
| **Render.com** | سهل جداً، PostgreSQL مجاني | مجاني |
| **Fly.io** | سريع، سهل | مجاني |
| **VPS Ubuntu** | تحكم كامل | من $5/شهر |

