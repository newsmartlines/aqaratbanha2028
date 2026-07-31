#!/bin/bash
# استعادة قاعدة البيانات من اللقطة المحفوظة
# تشغيل: bash database/restore.sh
set -e
if [ ! -f "database/snapshot.sql" ]; then
  echo "❌ الملف database/snapshot.sql غير موجود"
  exit 1
fi
echo "⏳ جاري استعادة قاعدة البيانات..."
psql $DATABASE_URL -f database/snapshot.sql 2>&1 | tail -5
echo "✅ تمت الاستعادة بنجاح"
