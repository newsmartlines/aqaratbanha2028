# دليل النشر — عقارات بنها

> مشروع Node.js/Express + React/Vite مستقل تمامًا، يعمل على أي بيئة استضافة.

---

## المتطلبات الأساسية

| المتطلب | الإصدار |
|---|---|
| Node.js | 18+ (يُنصح بـ 20 LTS أو 22 LTS) |
| pnpm | 8+ (`npm install -g pnpm`) |
| PostgreSQL | 14+ |

---

## 1. تشغيل محلي (Development)

```bash
# 1. استنسخ المشروع
git clone <repo-url>
cd <project-folder>

# 2. ثبّت المتطلبات
pnpm install

# 3. أنشئ ملف البيئة
cp .env.example .env
# ثم عدّل .env وأضف DATABASE_URL الخاص بك

# 4. أنشئ الجداول في قاعدة البيانات
pnpm db:push

# 5. شغّل المشروع (API + Frontend معًا)
pnpm dev
```

- الواجهة الأمامية: http://localhost:5000
- الـ API: http://localhost:3000

---

## 2. البناء للإنتاج (Production Build)

```bash
# بناء الواجهة الأمامية والـ API معًا
pnpm build:deploy

# تشغيل الإنتاج (سيخدم الواجهة + الـ API من نفس المنفذ)
pnpm start
```

---

## 3. نشر على VPS (Ubuntu/Debian)

### أ) تثبيت المتطلبات

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# إنشاء قاعدة البيانات
sudo -u postgres psql -c "CREATE DATABASE aqaratbanha;"
sudo -u postgres psql -c "CREATE USER appuser WITH PASSWORD 'strongpassword';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE aqaratbanha TO appuser;"
```

### ب) نشر التطبيق

```bash
# استنسخ المشروع
git clone <repo-url> /var/www/aqaratbanha
cd /var/www/aqaratbanha

# أنشئ ملف البيئة
cp .env.example .env
nano .env  # عدّل القيم

# مثال .env للإنتاج:
# DATABASE_URL=postgresql://appuser:strongpassword@localhost:5432/aqaratbanha
# NODE_ENV=production
# PORT=3000
# SESSION_SECRET=<strong-random-string>
# CORS_ORIGIN=https://yourdomain.com

# ثبّت المتطلبات
pnpm install --frozen-lockfile

# أنشئ الجداول
pnpm db:push

# ابنِ المشروع
pnpm build:deploy

# شغّل
pnpm start
```

### ج) إعداد PM2 (للتشغيل الدائم)

```bash
npm install -g pm2

# شغّل التطبيق مع PM2
pm2 start "pnpm start" --name "aqaratbanha"
pm2 save
pm2 startup

# أوامر مفيدة
pm2 status
pm2 logs aqaratbanha
pm2 restart aqaratbanha
```

### د) إعداد Nginx (كـ Reverse Proxy)

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Static uploads
    location /uploads/ {
        alias /var/www/aqaratbanha/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_read_timeout 60s;
    }
}
```

---

## 4. نشر على cPanel (Node.js App)

### أ) الإعداد في cPanel

1. اذهب إلى **Setup Node.js App**
2. أنشئ تطبيق جديد:
   - **Node.js version**: 20.x أو 22.x
   - **Application mode**: Production
   - **Application root**: `/home/user/aqaratbanha`
   - **Application URL**: `yourdomain.com`
   - **Application startup file**: `artifacts/api-server/dist/index.mjs`
3. أضف متغيرات البيئة في **Environment Variables**:
   ```
   DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
   NODE_ENV=production
   PORT=<auto-assigned by cPanel>
   SESSION_SECRET=<random-string>
   CORS_ORIGIN=https://yourdomain.com
   FRONTEND_DIST=/home/user/aqaratbanha/artifacts/marketplace/dist/public
   UPLOADS_DIR=/home/user/aqaratbanha/uploads
   ```

### ب) رفع الملفات عبر SSH/Git

```bash
# على السيرفر (SSH)
cd ~/aqaratbanha
git pull

# ثبّت المتطلبات
pnpm install --frozen-lockfile

# ابنِ المشروع
pnpm build:deploy

# أنشئ/حدّث الجداول
pnpm db:push

# أعد تشغيل التطبيق من cPanel → Setup Node.js App → Restart
```

---

## 5. تشغيل على Windows (Local/Desktop)

### أ) المتطلبات

- نزّل وثبّت [Node.js 20 LTS](https://nodejs.org/)
- ثبّت pnpm: `npm install -g pnpm`
- نزّل وثبّت [PostgreSQL](https://www.postgresql.org/download/windows/)

### ب) إعداد قاعدة البيانات

افتح **pgAdmin** أو **psql** وشغّل:
```sql
CREATE DATABASE aqaratbanha;
CREATE USER appuser WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE aqaratbanha TO appuser;
```

### ج) تشغيل المشروع

```cmd
cd C:\path\to\aqaratbanha

rem أنشئ .env (انسخ .env.example وعدّله)
copy .env.example .env

rem ثبّت المتطلبات
pnpm install

rem أنشئ الجداول
pnpm db:push

rem شغّل للتطوير
pnpm dev
```

أو للإنتاج:
```cmd
pnpm build:deploy
pnpm start
```

افتح المتصفح على: http://localhost:3000

---

## 6. متغيرات البيئة المهمة

| المتغير | الوصف | مثال |
|---|---|---|
| `DATABASE_URL` | رابط PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `PORT` | منفذ الـ API | `3000` |
| `NODE_ENV` | بيئة التشغيل | `production` |
| `SESSION_SECRET` | مفتاح تشفير الجلسات | سلسلة عشوائية طويلة |
| `CORS_ORIGIN` | نطاقات CORS المسموحة | `https://yourdomain.com` |
| `FRONTEND_DIST` | مسار ملفات الواجهة | مسار مطلق لـ `dist/public` |
| `UPLOADS_DIR` | مجلد رفع الملفات | `/var/www/uploads` |
| `VITE_API_BASE_URL` | URL الـ API للواجهة | `https://api.yourdomain.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth (اختياري) | من Google Console |
| `OPENAI_API_KEY` | مفتاح OpenAI (اختياري) | `sk-...` |
| `LOG_LEVEL` | مستوى التسجيل | `info` |

---

## 7. بيانات الدخول الافتراضية (بعد أول تشغيل)

| الدور | البريد | كلمة المرور |
|---|---|---|
| مدير | `admin@aqaratbanha.com` | `admin123` |
| مزود خدمة | `ahmed@aqaratbanha.com` | `provider123` |

> **تنبيه أمني:** غيّر كلمات المرور الافتراضية فورًا بعد النشر.

---

## 8. هيكل مجلد الإنتاج

```
project/
├── artifacts/
│   ├── api-server/
│   │   ├── dist/         ← ملفات الـ API المبنية (بعد build)
│   │   └── src/          ← مصدر الـ API
│   └── marketplace/
│       ├── dist/public/  ← ملفات الواجهة المبنية (بعد build)
│       └── src/          ← مصدر الواجهة
├── uploads/              ← ملفات المستخدمين المرفوعة
├── lib/db/               ← مخطط قاعدة البيانات
├── .env                  ← متغيرات البيئة (لا ترفعه لـ Git!)
└── .env.example          ← نموذج متغيرات البيئة
```

---

## 9. استكشاف الأخطاء

### المشكلة: `DATABASE_URL must be set`
أنشئ ملف `.env` من `.env.example` وأضف `DATABASE_URL`.

### المشكلة: `relation "X" does not exist`
شغّل: `pnpm db:push` لإنشاء الجداول.

### المشكلة: صفحة بيضاء في الإنتاج
تأكد أن `pnpm build:deploy` تم بنجاح وأن `FRONTEND_DIST` يشير للمسار الصحيح.

### المشكلة: الصور لا تظهر
تأكد أن `UPLOADS_DIR` موجود وله صلاحيات القراءة والكتابة.

### المشكلة: CORS errors
أضف نطاق الواجهة في `CORS_ORIGIN`.
