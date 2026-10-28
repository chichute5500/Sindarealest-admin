#!/usr/bin/env bash
# Emulator-only smoke: no credentials or Production mutations.
set -euo pipefail
APK="${1:-qa-apk/app-debug.apk}"
PKG='com.sindarealest.taobaoimport'
test -s "$APK"
await_ui() {
  local needle="$1" output="$2"
  for attempt in $(seq 1 12); do
    adb shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 || true
    adb shell cat /sdcard/window.xml > "$output" 2>/dev/null || true
    if grep -Fq "$needle" "$output"; then return 0; fi
    sleep 2
  done
  echo "FAIL: Android UI did not show expected text: $needle" >&2
  adb shell screencap -p /sdcard/taobao-import-emulator.png || true
  adb pull /sdcard/taobao-import-emulator.png ./taobao-import-emulator.png >/dev/null 2>&1 || true
  grep -o 'text="[^"]*"' "$output" | head -20 >&2 || true
  return 1
}
adb install -r "$APK"
adb shell am start -W -n "$PKG/.MainActivity" | tee /tmp/taobao-first-launch.txt
grep -Eq 'Status: ok|Activity: com.sindarealest.taobaoimport/.MainActivity' /tmp/taobao-first-launch.txt
await_ui 'SinDarealest' /tmp/taobao-first-screen.xml
await_ui 'Mở Taobao' /tmp/taobao-first-screen.xml
adb shell am start -W -a android.intent.action.SEND -t text/plain \
  --es android.intent.extra.TEXT 'https://item.taobao.com/item.htm?id=12345678' \
  -n "$PKG/.MainActivity" | tee /tmp/taobao-shared-link.txt
await_ui '12345678' /tmp/taobao-shared-screen.xml
adb shell am start -W -a android.intent.action.SEND -t text/plain \
  --es android.intent.extra.TEXT 'https://taobao.com.evil.example/item/1' \
  -n "$PKG/.MainActivity" >/dev/null
await_ui 'không thuộc tên miền' /tmp/taobao-rejected-screen.xml
# Exercise Android ACTION_SEND image with an actual MediaStore content:// URI.
# This proves ContentResolver access and scoped image persistence, not Taobao login.
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAALUlEQVR4nGOclmLDQEvARFPTRy0YtWDUglELRi0YtWDUglELRi0YtWDUAioCAD2+AXadpnZ5AAAAAElFTkSuQmCC' | base64 -d > /tmp/sd-share-source.png
inserted="$(adb shell content insert \
  --uri content://media/external/images/media \
  --bind _display_name:s:sd-import-qa.png \
  --bind mime_type:s:image/png \
  --bind relative_path:s:Pictures/SinDarealest-QA 2>&1)"
echo "MediaStore QA insert result: $inserted"
media_uri="$(printf '%s' "$inserted" | sed -n 's/.*\(content:\/\/media\/[^[:space:]]*\).*/\1/p' | tr -d '\r' | head -1)"
if [ -z "$media_uri" ]; then
  query="$(adb shell content query --uri content://media/external/images/media \
    --projection _id:_display_name 2>&1 || true)"
  # Avoid passing shell-escaped SQL into adb content --where: some emulators
  # strip the string quotes and reject filenames containing '-' as SQL tokens.
  media_id="$(printf '%s' "$query" | grep -F 'sd-import-qa.png' \
    | sed -n 's/.*_id=\([0-9][0-9]*\).*/\1/p' | head -1 || true)"
  echo "MediaStore QA query matched source: $([ -n "$media_id" ] && echo yes || echo no)"
  if [ -n "$media_id" ]; then media_uri="content://media/external/images/media/$media_id"; fi
fi
test -n "$media_uri" || { echo "FAIL: synthetic MediaStore URI unavailable" >&2; exit 1; }
adb shell content write --uri "$media_uri" < /tmp/sd-share-source.png
adb shell am start -W -a android.intent.action.SEND -t image/png \
  --eu android.intent.extra.STREAM "$media_uri" --grant-read-uri-permission \
  -n "$PKG/.MainActivity" >/tmp/taobao-shared-image.txt
image_saved=0
for attempt in $(seq 1 15); do
  adb shell uiautomator dump /sdcard/window.xml >/dev/null
  adb shell cat /sdcard/window.xml > /tmp/taobao-image-share-screen.xml
  if grep -q 'Đã lưu 1 ảnh' /tmp/taobao-image-share-screen.xml; then image_saved=1;break;fi
  sleep 1
done
test "$image_saved" = '1' || { echo "FAIL: Android shared image not persisted into MediaStore" >&2; exit 1; }
echo 'PASS: Android image share via content URI was saved in scoped MediaStore.'
adb shell cmd uimode night yes >/dev/null
adb shell am start -W -n "$PKG/.MainActivity" >/dev/null
await_ui 'SinDarealest' /tmp/taobao-dark-screen.xml
adb shell screencap -p /sdcard/taobao-import-emulator.png
adb pull /sdcard/taobao-import-emulator.png ./taobao-import-emulator.png >/dev/null
adb shell cmd uimode night no >/dev/null
if adb logcat -d -t 12000 | grep -A 18 'FATAL EXCEPTION' | grep -q 'com.sindarealest.taobaoimport'; then
  echo 'FAIL: importer fatal exception' >&2; exit 1
fi
echo 'PASS: APK installs/starts; Taobao link accepted, fake host rejected, dark theme and crash checks pass.'
