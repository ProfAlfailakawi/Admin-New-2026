#!/bin/bash
set -e
cd "$(dirname "$0")"
printf '\nتجهيز جسر واتساب التراث على هذا الماك...\n\n'
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js غير مثبت. ثبّت Node.js 20 أو أحدث من nodejs.org ثم أعد تشغيل هذا الملف.'
  read -r -p 'اضغط Enter للإغلاق...'
  exit 1
fi
NODE_MAJOR=$(node -p "Number(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "نسخة Node.js الحالية $(node -v). نحتاج Node.js 20 أو أحدث."
  read -r -p 'اضغط Enter للإغلاق...'
  exit 1
fi
if [ ! -f .env ]; then
  cp .env.example .env
  echo 'تم إنشاء ملف .env. افتحه وعدّل الرابط والسر قبل التشغيل.'
  open -e .env || true
fi
npm install --no-audit --no-fund
printf '\n✅ اكتمل التثبيت. بعد تعديل .env شغّل start-mac.command\n'
read -r -p 'اضغط Enter للإغلاق...'
