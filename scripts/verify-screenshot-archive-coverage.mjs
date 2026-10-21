import { readdir } from 'node:fs/promises';
import path from 'node:path';

async function listPngNames(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    throw new Error('Cannot read screenshot directory "' + directory + '": ' + (error.message || error));
  }
  return entries
    .filter((entry) => entry.isFile() && /\.png$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

const [baselineDir, captureDir] = process.argv.slice(2);
if (!baselineDir || !captureDir) {
  console.error('Usage: node scripts/verify-screenshot-archive-coverage.mjs <baseline-dir> <live-capture-dir>');
  process.exit(2);
}

try {
  const [baselineNames, captureNames] = await Promise.all([
    listPngNames(path.resolve(baselineDir)),
    listPngNames(path.resolve(captureDir)),
  ]);
  const baselineSet = new Set(baselineNames);
  const captureSet = new Set(captureNames);
  const baselineOnly = baselineNames.filter((name) => !captureSet.has(name));
  const captureOnly = captureNames.filter((name) => !baselineSet.has(name));
  const result = {
    status: 'PASS',
    baselineImageCount: baselineNames.length,
    liveCaptureImageCount: captureNames.length,
    baselineOnly,
    captureOnly,
  };
  if (baselineNames.length < 50 || captureNames.length < 50 || baselineOnly.length || captureOnly.length) {
    result.status = 'FAIL_EXACT_SCREENSHOT_FILENAME_COVERAGE';
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  console.error(String(error.message || error));
  process.exitCode = 1;
}
