import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const WRANGLER_CLI = resolve('node_modules/wrangler/bin/wrangler.js');

export function hasWrangler() {
  return existsSync(WRANGLER_CLI);
}

/** Run Wrangler without ever sending credentials to command-line arguments. */
export function runWrangler(args, { interactive = false, quiet = false } = {}) {
  if (!hasWrangler()) {
    throw new Error('Chưa cài Wrangler. Hãy chạy `npm install` trong thư mục dự án.');
  }
  const result = spawnSync(process.execPath, [WRANGLER_CLI, ...args], {
    encoding: 'utf8',
    stdio: interactive ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  if (result.error) throw result.error;
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  if (!quiet && !interactive) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  }
  if (result.status !== 0) {
    const detail = `${stdout}\n${stderr}`.trim();
    throw new Error(`Wrangler thất bại (mã ${result.status ?? 'không xác định'}): wrangler ${args.join(' ')}${detail ? `\n${detail}` : ''}`);
  }
  return { stdout, stderr, status: result.status };
}

/** Parse JSON even when a CLI prefixes a short informational line. Fail closed. */
export function parseCliJson(output, description = 'kết quả JSON của Wrangler') {
  const raw = String(output || '').trim();
  try { return JSON.parse(raw); } catch { /* Try a JSON document surrounded by CLI notices. */ }
  for (let start = 0; start < raw.length; start++) {
    if (raw[start] !== '[' && raw[start] !== '{') continue;
    const stack = [];
    let inString = false;
    let escaped = false;
    for (let end = start; end < raw.length; end++) {
      const ch = raw[end];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === '{' || ch === '[') stack.push(ch);
      else if (ch === '}' || ch === ']') {
        const expected = ch === '}' ? '{' : '[';
        if (stack.pop() !== expected) break;
        if (stack.length === 0) {
          try { return JSON.parse(raw.slice(start, end + 1)); } catch { break; }
        }
      }
    }
  }
  throw new Error(`Không đọc được ${description}. Để an toàn, không thực hiện thay đổi từ xa.`);
}

export function findNamedRecord(value, expectedName, nameKeys = ['name', 'project_name', 'database_name', 'bucket_name']) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNamedRecord(item, expectedName, nameKeys);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  if (nameKeys.some((key) => value[key] === expectedName)) return value;
  for (const item of Object.values(value)) {
    const found = findNamedRecord(item, expectedName, nameKeys);
    if (found) return found;
  }
  return null;
}

export function listPagesProjects() {
  const result = runWrangler(['pages', 'project', 'list', '--json'], { quiet: true });
  return parseCliJson(result.stdout, 'danh sách Cloudflare Pages project');
}

export function listD1Databases() {
  const result = runWrangler(['d1', 'list', '--json'], { quiet: true });
  return parseCliJson(result.stdout, 'danh sách Cloudflare D1 database');
}

export function assertSafeName(value, label) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value)) {
    throw new Error(`${label} không hợp lệ. Hãy dùng tên chính xác trong Dashboard, chỉ gồm chữ thường, số và dấu gạch ngang.`);
  }
}

export function readProductCount(databaseName) {
  const result = runWrangler([
    'd1', 'execute', databaseName, '--remote', '--json',
    '--command', 'SELECT COUNT(*) AS product_count FROM products;',
  ], { quiet: true });
  const data = parseCliJson(result.stdout, 'số lượng sản phẩm D1');
  const findCount = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findCount(item);
        if (found !== null) return found;
      }
    } else if (value && typeof value === 'object') {
      if (Object.hasOwn(value, 'product_count')) {
        const n = Number(value.product_count);
        return Number.isSafeInteger(n) && n >= 0 ? n : null;
      }
      for (const item of Object.values(value)) {
        const found = findCount(item);
        if (found !== null) return found;
      }
    }
    return null;
  };
  const count = findCount(data);
  if (count === null) throw new Error('Không xác minh được số sản phẩm trong D1. Đã dừng để tránh nhập dữ liệu nhầm hoặc trùng.');
  return count;
}
