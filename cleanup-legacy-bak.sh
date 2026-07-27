#!/bin/bash
# ─────────────────────────────────────────────────────────────
# تنظيف ملفات النسخ الاحتياطية القديمة (.bak) من مستودع Admin-New-2026
# آمن 100%: هذه الملفات لا تُستورد بأي كود ولا تدخل البناء الإنتاجي إطلاقاً.
# شغّله من جذر المشروع:  bash cleanup-legacy-bak.sh
# ─────────────────────────────────────────────────────────────
set -e
files=(
  "src/components/PartnerDashboard.tsx.bak"
  "src/lib/pushNotifications.ts.bak-final-alert-real-error"
  "src/lib/pushNotifications.ts.bak-fix-gettoken-cors"
  "src/lib/pushNotifications.ts.bak-fix-pushstage-undefined"
  "src/lib/pushNotifications.ts.bak-fix-support-no-firebase"
  "src/lib/pushNotifications.ts.bak-fix-sw-registration-ios"
  "src/lib/pushNotifications.ts.bak-ios-native-push-test"
  "src/lib/pushNotifications.ts.bak-native-only-test"
  "src/lib/pushNotifications.ts.bak-stage-exact"
)
for f in "${files[@]}"; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    git rm -q "$f" && echo "✓ حُذف: $f"
  elif [ -f "$f" ]; then
    rm -f "$f" && echo "✓ حُذف (غير متتبع): $f"
  else
    echo "• غير موجود أصلاً: $f"
  fi
done
echo ""
echo "تم. راجِع التغييرات ثم:  git commit -m 'chore: remove legacy .bak backup files'"
