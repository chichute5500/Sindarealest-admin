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
    # GitHub's Google Pixel Launcher occasionally ANRs immediately after emulator boot.
    # Dismiss ONLY that system overlay and refocus the inspected app. Never mask
    # exceptions in the SinDarealest process or accept absent UI as a PASS.
    if grep -Fq "Pixel Launcher isn't responding" "$output"; then
      echo 'System emulator launcher ANR; dismissing system overlay and refocusing importer'
      adb shell input keyevent 4 >/dev/null || true
      adb shell am start -n "$PKG/.MainActivity" >/dev/null || true
    fi
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
await_ui 'Duyệt Taobao' /tmp/taobao-first-screen.xml
adb shell am start -W -a android.intent.action.SEND -t text/plain \
  --es android.intent.extra.TEXT 'https://item.taobao.com/item.htm?id=12345678' \
  -n "$PKG/.MainActivity" | tee /tmp/taobao-shared-link.txt
await_ui '12345678' /tmp/taobao-shared-screen.xml
adb shell am start -W -a android.intent.action.SEND -t text/plain \
  --es android.intent.extra.TEXT 'https://taobao.com.evil.example/item/1' \
  -n "$PKG/.MainActivity" >/dev/null
await_ui 'không thuộc tên miền' /tmp/taobao-rejected-screen.xml
# Cross-package image share via separate, emulator-only QA app.
# Unlike adb shell content insert, the QA sender owns its MediaStore content URI,
# grants scoped read permission, and sends Android ACTION_SEND to the import app.
HELPER_APK="${2:-qa-helper/qa-sender-debug.apk}"
test -s "$HELPER_APK" || { echo 'FAIL: isolated QA sender APK unavailable' >&2; exit 1; }
adb install -r "$HELPER_APK"
adb logcat -c
adb shell am start -W -n 'com.sindarealest.taobaoimport.qasender/.ShareImageActivity' >/tmp/taobao-shared-image.txt
await_ui 'Đã lưu 1 ảnh' /tmp/taobao-image-share-screen.xml
if adb logcat -d -t 2500 | grep -q 'Cross-package image delivery failed'; then
  echo 'FAIL: QA sender failed to grant Android image content URI' >&2; exit 1
fi
echo 'PASS: Android separate-app content URI saved through scoped MediaStore.'
adb shell cmd uimode night yes >/dev/null
adb shell am start -W -n "$PKG/.MainActivity" >/dev/null
await_ui 'SinDarealest' /tmp/taobao-dark-screen.xml
adb shell screencap -p /sdcard/taobao-import-emulator.png
adb pull /sdcard/taobao-import-emulator.png ./taobao-import-emulator.png >/dev/null
adb shell cmd uimode night no >/dev/null
if adb logcat -d -t 12000 | grep -A 18 'FATAL EXCEPTION' | grep -q 'com.sindarealest.taobaoimport'; then
  echo 'FAIL: importer fatal exception' >&2; exit 1
fi
# Test the *existing embedded WebView* with synthetic DOM images and a real
# unauthenticated product URL. This is not a test of an owner's Taobao login.
TEST_APK="${3:-qa-webview-test/app-debug-androidTest.apk}"
test -s "$TEST_APK" || { echo 'FAIL: WebView instrumentation not built' >&2; exit 1; }
adb install -r "$TEST_APK"
adb logcat -c
adb shell am instrument -w   com.sindarealest.taobaoimport.test/androidx.test.runner.AndroidJUnitRunner   | tee /tmp/taobao-instrumented-webview.txt
grep -q 'OK (2 tests)' /tmp/taobao-instrumented-webview.txt   || { echo 'FAIL: WebView DOM scan / live-page probe instrumentation' >&2; exit 1; }
adb logcat -d -s SD_TAOBAO_LIVE:I SD_TAOBAO_QA:I '*:S' | tail -25
echo 'PASS: APK installs/starts; Taobao link accepted, fake host rejected, dark theme and crash checks pass.'
