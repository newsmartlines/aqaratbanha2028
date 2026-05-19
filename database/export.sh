#!/bin/bash
# حفظ لقطة قاعدة البيانات الحالية
# تشغيل: bash database/export.sh
set -e
echo "⏳ جاري تصدير قاعدة البيانات..."
pg_dump $DATABASE_URL --no-owner --no-acl --inserts 2>/dev/null \
  | grep -v '^\\.restrict' \
  > database/snapshot.sql
echo "✅ تم الحفظ في database/snapshot.sql ($(wc -l < database/snapshot.sql) سطر)"
