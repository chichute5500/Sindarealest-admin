import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
const themeToggle = html.slice(html.indexOf("function applyAdminTheme"), html.indexOf("function toast"));
assert.ok(themeToggle.includes("mode==='dark'||(mode==='auto'"), "dark theme must only be enabled for an explicit dark setting or explicit auto mode with dark system preference");
assert.ok(html.includes("let adminThemeMode='light';try{adminThemeMode=localStorage.getItem('sd-theme-mode')||'light'}catch{}applyAdminTheme(adminThemeMode)"),
  "Admin must default to light mode when no user preference is saved");
assert.ok(html.includes("document.documentElement.dataset.adminTheme=dark?'dark':'light'"),
  "the theme data attribute must match the computed theme rather than invert it");
assert.ok(html.includes(":root[data-admin-theme=\"dark\"]{color-scheme:dark;--bg:#090908"),
  "the dark theme selector must apply dark surfaces only when the root theme is dark");
assert.ok(!html.includes(":root[data-admin-theme=\"dark\"]{color-scheme:light;--bg:#f4f0e9"),
  "dark mode must never switch to light surfaces");
assert.ok(html.includes("$('#adminThemeToggle').addEventListener('click'"), "the explicit theme toggle must remain available");
console.log("PASS: Admin defaults to light appearance and explicit dark mode is not inverted.");
