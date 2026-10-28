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
