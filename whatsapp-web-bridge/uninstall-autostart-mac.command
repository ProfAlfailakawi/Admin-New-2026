#!/bin/bash
set -e
PLIST="$HOME/Library/LaunchAgents/com.alturathkw.whatsapp-bridge.plist"
launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
rm -f "$PLIST"
echo '✅ تم إلغاء التشغيل التلقائي. لم تُحذف جلسة واتساب.'
read -r -p 'اضغط Enter للإغلاق...'
