#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node --check web/taobao-import-client.js
node tests/import-draft.test.mjs
python qa-browser-memory.py
python tests/check-android-java.py
