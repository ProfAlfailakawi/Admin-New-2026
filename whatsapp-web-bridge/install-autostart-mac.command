#!/bin/bash
set -e
cd "$(dirname "$0")"
SOURCE_DIR="$PWD"
RESIDENT_ROOT="$HOME/Library/Application Support/AlturathWhatsAppBridge"
BRIDGE_DIR="$RESIDENT_ROOT/app"
SESSION_DIR="$RESIDENT_ROOT/session"
LOG_DIR="$RESIDENT_ROOT/logs"
LABEL="com.alturathkw.whatsapp-bridge"
NODE_PATH="$(command -v node || true)"
if [ -z "$NODE_PATH" ]; then
  echo 'Node.js غير مثبت. شغّل install-mac.command أولاً.'
  read -r -p 'اضغط Enter للإغلاق...'
  exit 1
fi
if [ ! -f "$SOURCE_DIR/.env" ]; then
  echo 'شغّل install-mac.command وعدّل .env أولاً.'
  read -r -p 'اضغط Enter للإغلاق...'
  exit 1
fi
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
mkdir -p "$HOME/Library/LaunchAgents" "$BRIDGE_DIR" "$SESSION_DIR" "$LOG_DIR"

# Keep runtime/session data outside the website folder so a ZIP replacement cannot
# remove the live service. Copy only the bridge application and preserve the session.
for FILE in index.mjs service-runner.mjs package.json package-lock.json .env; do
  cp "$SOURCE_DIR/$FILE" "$BRIDGE_DIR/$FILE"
done
chmod 600 "$BRIDGE_DIR/.env"

if [ -d "$SOURCE_DIR/.session" ] && [ ! -d "$SESSION_DIR/session-alturath-mac-main" ]; then
  cp -R "$SOURCE_DIR/.session/." "$SESSION_DIR/"
fi

cd "$BRIDGE_DIR"
npm ci --omit=dev --no-audit --no-fund

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/caffeinate</string>
    <string>-dimsu</string>
    <string>$NODE_PATH</string>
    <string>$BRIDGE_DIR/service-runner.mjs</string>
  </array>
  <key>WorkingDirectory</key><string>$BRIDGE_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>WHATSAPP_SESSION_PATH</key><string>$SESSION_DIR</string>
    <key>WHATSAPP_BRIDGE_DEVICE_ID</key><string>alturath-mac-main</string>
    <key>NPM_BIN</key><string>$(command -v npm)</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOG_DIR/launchd.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/launchd-error.log</string>
</dict>
</plist>
PLIST
launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart -k "gui/$(id -u)/$LABEL"
echo '✅ تم تثبيت التشغيل التلقائي. البوت سيعمل عند تسجيل دخولك للماك ويعاد تشغيله عند الانقطاع.'
echo 'سيستخدم caffeinate لمنع النوم أثناء تشغيل البوت فقط، من دون تغيير إعدادات الجهاز.'
echo "السجل: $LOG_DIR/bridge.log"
read -r -p 'اضغط Enter للإغلاق...'
