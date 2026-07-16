#!/bin/bash
cd "$(dirname "$0")"
if [ ! -f .env ]; then
  echo 'ملف .env غير موجود. شغّل install-mac.command أولاً.'
  read -r -p 'اضغط Enter للإغلاق...'
  exit 1
fi
if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund
fi
printf '\nتشغيل بوت واتساب التراث. للإيقاف اضغط Control + C.\n\n'
while true; do
  node index.mjs
  CODE=$?
  if [ "$CODE" -eq 0 ]; then
    break
  fi
  echo "أُغلق الجسر برمز $CODE. إعادة التشغيل خلال 5 ثوانٍ..."
  sleep 5
done
