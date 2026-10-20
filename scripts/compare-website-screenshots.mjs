import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const root = process.cwd();
const baselineDir = path.join(root, 'docs', 'website-screenshots', 'start-of-work');
const resultDir = path.join(root, 'docs', 'website-screenshots', 'end-of-work');
const outDir = path.join(root, 'artifacts', 'website-screenshot-diffs');
async function listPngs(dir) {
  try { return (await fs.readdir(dir)).filter((name) => /\.png$/i.test(name)).sort(); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const baselineNames = await listPngs(baselineDir);
const resultNames = await listPngs(resultDir);
const baselineSet = new Set(baselineNames);
const resultSet = new Set(resultNames);
const commonNames = baselineNames.filter((name) => resultSet.has(name));
await fs.mkdir(path.join(outDir, 'baseline'), { recursive: true });
await fs.mkdir(path.join(outDir, 'end'), { recursive: true });
await fs.mkdir(path.join(outDir, 'diffs'), { recursive: true });
const report = {
  generatedAtUtc: new Date().toISOString(),
  comparisonMethod: 'pixelmatch@6.0.0 + pngjs@7.0.0 on same-name PNG screenshots; dimensions must match',
  baselineImageCount: baselineNames.length, resultImageCount: resultNames.length, matchingFilenameCount: commonNames.length,
  baselineOnly: baselineNames.filter((name) => !resultSet.has(name)),
  resultOnly: resultNames.filter((name) => !baselineSet.has(name)),
  status: 'BLOCKED_NO_MATCHING_IMAGES', pairs: [],
};
for (const name of commonNames) {
  const beforeBytes = await fs.readFile(path.join(baselineDir, name));
  const afterBytes = await fs.readFile(path.join(resultDir, name));
  await fs.copyFile(path.join(baselineDir, name), path.join(outDir, 'baseline', name));
  await fs.copyFile(path.join(resultDir, name), path.join(outDir, 'end', name));
  let before, after;
  try { before = PNG.sync.read(beforeBytes); after = PNG.sync.read(afterBytes); }
  catch (error) { report.pairs.push({ filename: name, status: 'INVALID_PNG', error: String(error.message || error) }); continue; }
  if (before.width !== after.width || before.height !== after.height) {
    report.pairs.push({ filename: name, status: 'DIMENSION_MISMATCH', baseline: {width:before.width,height:before.height}, result: {width:after.width,height:after.height}, diffPixels:null, diffPercent:null });
    continue;
  }
  const diff = new PNG({ width: before.width, height: before.height });
  const diffPixels = pixelmatch(before.data, after.data, diff.data, before.width, before.height, {
    threshold: 0.1, includeAA: true, alpha: 0.65, diffColor: [240, 35, 45], aaColor: [250, 190, 25],
  });
  await fs.writeFile(path.join(outDir, 'diffs', name), PNG.sync.write(diff));
  const pixels = before.width * before.height;
  report.pairs.push({
    filename: name, status: diffPixels === 0 ? 'PIXEL_IDENTICAL' : 'PIXEL_CHANGED',
    dimensions: {width:before.width,height:before.height}, diffPixels, totalPixels: pixels,
    diffRatio: Number((diffPixels / pixels).toFixed(6)), diffPercent: Number((100 * diffPixels / pixels).toFixed(3)),
    baselinePath: 'baseline/' + name, resultPath: 'end/' + name, diffPath: 'diffs/' + name,
  });
}
const comparable = report.pairs.filter((p) => p.status === 'PIXEL_IDENTICAL' || p.status === 'PIXEL_CHANGED');
const dimensionMismatches = report.pairs.filter((p) => p.status === 'DIMENSION_MISMATCH').length;
const invalidPairs = report.pairs.filter((p) => p.status === 'INVALID_PNG').length;
if (!commonNames.length) report.status = 'BLOCKED_NO_MATCHING_IMAGES';
else if (!comparable.length) report.status = 'BLOCKED_NO_COMPARABLE_IMAGES';
else if (report.baselineOnly.length || report.resultOnly.length || dimensionMismatches || invalidPairs) report.status = 'COMPLETE_WITH_MISSING_OR_SIZE_MISMATCH_REVIEW';
else if (comparable.some((p) => p.status === 'PIXEL_CHANGED')) report.status = 'COMPLETE_NEEDS_VISUAL_REVIEW';
else report.status = 'PIXEL_IDENTICAL';
report.summary = {
  comparablePairs: comparable.length,
  identicalPairs: comparable.filter((p) => p.status === 'PIXEL_IDENTICAL').length,
  changedPairs: comparable.filter((p) => p.status === 'PIXEL_CHANGED').length,
  dimensionMismatches, invalidPngPairs: invalidPairs,
  unmatchedBaselineImages: report.baselineOnly.length, unmatchedResultImages: report.resultOnly.length,
};
await fs.writeFile(path.join(outDir, 'comparison.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
const rows = report.pairs.map((p) => {
  const metric = p.diffPercent == null ? 'Not pixel-compared' : p.diffPercent + '% of pixels differ (' + p.diffPixels + ')';
  return '<tr><td>' + esc(p.filename) + '</td><td>' + esc(p.status) + '</td><td>' + esc(metric) + '</td><td>' +
    (p.baselinePath ? '<a href="' + esc(p.baselinePath) + '">baseline</a>' : '—') + ' / ' +
    (p.resultPath ? '<a href="' + esc(p.resultPath) + '">end</a>' : '—') + ' / ' +
    (p.diffPath ? '<a href="' + esc(p.diffPath) + '">diff mask</a>' : '—') + '</td></tr>';
}).join('\n');
const html = '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Website screenshot diff</title><style>body{font:14px/1.55 system-ui,sans-serif;color:#172b3c;background:#f2f7fb;margin:0;padding:18px}main{max-width:1200px;margin:auto}table{width:100%;border-collapse:collapse;background:white}td,th{border:1px solid #c5d8e7;padding:8px;text-align:left;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:white;padding:12px;border-radius:10px}.status{font-weight:700}</style><main><h1>Start vs end screenshot comparison</h1><p class="status">Status: ' + esc(report.status) + '</p><p>Pixel-diff is a review aid, not an aesthetic score. Any change requires human visual review; image-dimension changes are reported separately.</p><pre>' + esc(JSON.stringify(report.summary,null,2)) + '</pre><p>Baseline only: ' + esc(report.baselineOnly.join(', ') || 'none') + '</p><p>End only: ' + esc(report.resultOnly.join(', ') || 'none') + '</p><table><thead><tr><th>Image</th><th>Status</th><th>Pixel diff</th><th>Files</th></tr></thead><tbody>' + rows + '</tbody></table></main></html>';
await fs.writeFile(path.join(outDir, 'report.html'), html, 'utf8');
console.log(JSON.stringify({ status: report.status, summary: report.summary, baselineImageCount: report.baselineImageCount, resultImageCount: report.resultImageCount }, null, 2));
if (!commonNames.length || !comparable.length) process.exitCode = 1;
