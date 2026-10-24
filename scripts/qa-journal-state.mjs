/** Preserve per-run QA evidence across the independent finally/always cleanup jobs. */
export function recoverQaJournal(source, expectedTag, fallback) {
  try {
    if (typeof source !== 'string' || !source.trim()) return fallback;
    const prior = JSON.parse(source);
    if (!prior || prior.tag !== expectedTag || prior.environment !== 'ISOLATED_PREVIEW_ONLY' ||
        !prior.records || typeof prior.records !== 'object' || Array.isArray(prior.records)) return fallback;
    return { ...fallback, ...prior, tag: expectedTag, environment: 'ISOLATED_PREVIEW_ONLY' };
  } catch { return fallback; }
}
