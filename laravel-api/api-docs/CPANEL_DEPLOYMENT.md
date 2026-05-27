# cPanel Deployment Guide — دليل الخدمات Laravel API

## Prerequisites

- cPanel hosting with:
  - PHP 8.2+ (with extensions: `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`, `curl`, `json`, `fileinfo`)
  - MySQL 5.7+ or MariaDB 10.3+
  - Composer access (SSH or cPanel Terminal)
  - `public_html` or a subdomain folder

---

## Step 1: Prepare Local Build

On your local machine:

```bash
cd laravel-api
composer install --optimize-autoloader --no-dev
php artisan key:generate --show
# Copy the generated key — you'll need it for .env
```

---

## Step 2: Upload Files

**Option A: ZIP Upload**
```bash
# In laravel-api folder, zip everything
zip -r daleel-api.zip . --exclude ".git/*" "node_modules/*"
```
Upload via cPanel File Manager, extract into your desired folder (e.g. `/home/user/daleel-api/`).

**Option B: Git Clone via SSH**
```bash
git clone https://github.com/yourrepo/daleel-api.git /home/user/daleel-api
cd /home/user/daleel-api
composer install --optimize-autoloader --no-dev
```

---

## Step 3: Point Public Directory

The **document root** must point to `laravel-api/public`, not `laravel-api/`.

**For a subdomain (e.g. api.yourdomain.com):**
1. cPanel → Subdomains → Create subdomain
2. Set Document Root to: `/home/user/daleel-api/public`

**For a subfolder using `.htaccess` rewrite:**
In `public_html/.htaccess`, add:
```apache
RewriteEngine On
RewriteRule ^api-backend/(.*)$ /daleel-api/public/$1 [L]
```

---

## Step 4: Create MySQL Database

1. cPanel → MySQL Databases
2. Create database: `daleel_db`
3. Create user: `daleel_user` with strong password
4. Add user to database with **All Privileges**

---

## Step 5: Configure .env

In the `laravel-api` root, create `.env`:

```env
APP_NAME="دليل الخدمات"
APP_ENV=production
APP_KEY=base64:YOUR_GENERATED_KEY_HERE
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

LOG_CHANNEL=daily
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=daleel_db
DB_USERNAME=daleel_user
DB_PASSWORD=YourStrongPasswordHere

CACHE_DRIVER=file
FILESYSTEM_DISK=public
QUEUE_CONNECTION=sync
SESSION_DRIVER=file

SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com

# Commission rate (%)
DEFAULT_COMMISSION_RATE=10
```

---

## Step 6: Run Migrations & Seeders

Via **cPanel Terminal** or **SSH**:

```bash
cd /home/user/daleel-api

# Run migrations
php artisan migrate --force

# Seed initial data (regions, categories, packages, admin, settings)
php artisan db:seed --force

# Create storage symlink
php artisan storage:link

# Optimize for production
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Default admin credentials after seeding:
- **Admin:** `admin@daleel.sa` / `Admin@123456`
- **Moderator:** `moderator@daleel.sa` / `Mod@123456`

⚠️ **Change these passwords immediately after first login!**

---

## Step 7: File Permissions

```bash
chmod -R 755 /home/user/daleel-api
chmod -R 775 /home/user/daleel-api/storage
chmod -R 775 /home/user/daleel-api/bootstrap/cache
```

---

## Step 8: Cron Job (Subscription Expiry)

In cPanel → Cron Jobs, add:
```
* * * * * /usr/bin/php /home/user/daleel-api/artisan schedule:run >> /dev/null 2>&1
```

This runs the daily task that:
- Expires subscriptions past their `expires_at` date
- Reverts providers to `free` tier when subscription ends

---

## Step 9: Verify Deployment

Test the API:
```bash
curl https://api.yourdomain.com/api/categories
# Should return: {"success":true,"data":[...]}

curl https://api.yourdomain.com/api/settings
# Should return site settings
```

---

## Folder Structure on Server

```
/home/user/daleel-api/
├── app/
├── bootstrap/
│   └── cache/          ← needs write permission
├── config/
├── database/
├── public/             ← document root points here
│   ├── index.php
│   ├── .htaccess
│   └── storage/        ← symlink to ../storage/app/public
├── routes/
├── storage/
│   ├── app/public/     ← uploaded files live here
│   │   ├── avatars/
│   │   ├── banners/
│   │   └── services/
│   └── logs/           ← needs write permission
├── vendor/
├── .env                ← NEVER commit this
└── artisan
```

---

## public/.htaccess

The `public/.htaccess` must exist (it is included in the project):

```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 500 error | Check `storage/logs/laravel.log`. Set `APP_DEBUG=true` temporarily. |
| 403 on uploads | `chmod -R 775 storage/app/public` |
| Migrations fail | Check DB credentials in `.env` |
| Token invalid | Ensure `SANCTUM_STATEFUL_DOMAINS` matches your frontend domain |
| Storage symlink broken | Re-run `php artisan storage:link` |
| Cache stale | `php artisan config:clear && php artisan cache:clear` |

---

## CORS Configuration

If your frontend is on a different domain, edit `config/cors.php`:

```php
'allowed_origins' => ['https://yourdomain.com', 'https://app.yourdomain.com'],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => true,
```

---

## Updating the Application

```bash
cd /home/user/daleel-api
git pull origin main               # or upload new files
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```
