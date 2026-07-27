#!/bin/bash
set -e
cd "$(dirname "$0")"
BRIDGE_DIR="$PWD"
NODE_PATH="$(command -v node || true)"
if [ -z "$NODE_PATH" ]; then
  echo 'Node.js غير مثبت. شغّل install-mac.command أولاً.'
  read -r -p 'اضغط Enter للإغلاق...'
  exit 1
fi
if [ ! -f .env ] || [ ! -d node_modules ]; then
  echo 'شغّل install-mac.command وعدّل .env أولاً.'
  read -r -p 'اضغط Enter للإغلاق...'
  exit 1
fi
PLIST="$HOME/Library/LaunchAgents/com.alturath.whatsapp-bridge.plist"
mkdir -p "$HOME/Library/LaunchAgents" "$BRIDGE_DIR/logs"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.alturath.whatsapp-bridge</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/caffeinate</string>
    <string>-dimsu</string>
    <string>$NODE_PATH</string>
    <string>$BRIDGE_DIR/service-runner.mjs</string>
  </array>
  <key>WorkingDirectory</key><string>$BRIDGE_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$BRIDGE_DIR/logs/launchd.log</string>
  <key>StandardErrorPath</key><string>$BRIDGE_DIR/logs/launchd-error.log</string>
</dict>
</plist>
PLIST
launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart -k "gui/$(id -u)/com.alturath.whatsapp-bridge"
echo '✅ تم تثبيت التشغيل التلقائي. البوت سيعمل عند تسجيل دخولك للماك ويعاد تشغيله عند الانقطاع.'
echo 'سيستخدم caffeinate لمنع النوم أثناء تشغيل البوت فقط، من دون تغيير إعدادات الجهاز.'
echo "السجل: $BRIDGE_DIR/logs/bridge.log"
read -r -p 'اضغط Enter للإغلاق...'
