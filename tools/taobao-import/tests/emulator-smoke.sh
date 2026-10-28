#!/usr/bin/env bash
# Emulator-only smoke: no credentials or Production mutations.
set -euo pipefail
APK="${1:-qa-apk/app-debug.apk}"
PKG='com.sindarealest.taobaoimport'
test -s "$APK"
adb install -r "$APK"
adb shell am start -W -n "$PKG/.MainActivity" | tee /tmp/taobao-first-launch.txt
grep -Eq 'Status: ok|Activity: com.sindarealest.taobaoimport/.MainActivity' /tmp/taobao-first-launch.txt
adb shell uiautomator dump /sdcard/window.xml >/dev/null
adb shell cat /sdcard/window.xml > /tmp/taobao-first-screen.xml
grep -q 'SinDarealest' /tmp/taobao-first-screen.xml
grep -q 'Mở Taobao' /tmp/taobao-first-screen.xml
adb shell am start -W -a android.intent.action.SEND -t text/plain \
  --es android.intent.extra.TEXT 'https://item.taobao.com/item.htm?id=12345678' \
  -n "$PKG/.MainActivity" | tee /tmp/taobao-shared-link.txt
adb shell uiautomator dump /sdcard/window.xml >/dev/null
adb shell cat /sdcard/window.xml > /tmp/taobao-shared-screen.xml
grep -q '12345678' /tmp/taobao-shared-screen.xml
adb shell am start -W -a android.intent.action.SEND -t text/plain \
  --es android.intent.extra.TEXT 'https://taobao.com.evil.example/item/1' \
  -n "$PKG/.MainActivity" >/dev/null
adb shell uiautomator dump /sdcard/window.xml >/dev/null
adb shell cat /sdcard/window.xml > /tmp/taobao-rejected-screen.xml
grep -q 'không thuộc tên miền' /tmp/taobao-rejected-screen.xml
# Exercise Android ACTION_SEND image with an actual MediaStore content:// URI.
# This proves ContentResolver access and scoped image persistence, not Taobao login.
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAALUlEQVR4nGOclmLDQEvARFPTRy0YtWDUglELRi0YtWDUglELRi0YtWDUAioCAD2+AXadpnZ5AAAAAElFTkSuQmCC' | base64 -d > /tmp/sd-share-source.png
inserted="$(adb shell content insert \
  --uri content://media/external/images/media \
  --bind _display_name:s:sd-import-qa.png \
  --bind mime_type:s:image/png \
  --bind relative_path:s:Pictures/SinDarealest-QA 2>&1)"
echo "MediaStore test source: created"
media_uri="$(printf '%s' "$inserted" | sed -n 's/.*\(content:\/\/media\/[^[:space:]]*\).*/\1/p' | tr -d '\r' | head -1)"
test -n "$media_uri" || { echo "FAIL: synthetic MediaStore image URI was not created" >&2; exit 1; }
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
adb shell uiautomator dump /sdcard/window.xml >/dev/null
adb shell cat /sdcard/window.xml > /tmp/taobao-dark-screen.xml
grep -q 'SinDarealest' /tmp/taobao-dark-screen.xml
adb shell screencap -p /sdcard/taobao-import-emulator.png
adb pull /sdcard/taobao-import-emulator.png ./taobao-import-emulator.png >/dev/null
adb shell cmd uimode night no >/dev/null
if adb logcat -d -t 12000 | grep -A 18 'FATAL EXCEPTION' | grep -q 'com.sindarealest.taobaoimport'; then
  echo 'FAIL: importer fatal exception' >&2; exit 1
fi
echo 'PASS: APK installs/starts; Taobao link accepted, fake host rejected, dark theme and crash checks pass.'
