/**
 * Check numbered migration filenames before invoking Wrangler.
 * D1 migration sequence prefixes must be unique even when the full filenames differ.
 */
export function findDuplicateMigrationPrefixes(names) {
  const byPrefix = new Map();
  for (const name of names) {
    const match = /^(\d{4})_.+\.sql$/.exec(String(name));
    if (!match) continue;
    const prefix = match[1];
    const group = byPrefix.get(prefix) || [];
    group.push(String(name));
    byPrefix.set(prefix, group);
  }
  return [...byPrefix.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([prefix, filenames]) => ({ prefix, filenames: [...filenames].sort() }))
    .sort((a, b) => a.prefix.localeCompare(b.prefix));
}

export function assertUniqueMigrationPrefixes(names) {
  const duplicates = findDuplicateMigrationPrefixes(names);
  if (duplicates.length) {
    const detail = duplicates.map(({ prefix, filenames }) =>
      `${prefix}: ${filenames.join(", ")}`
    ).join("; ");
    throw new Error(`Duplicate D1 migration sequence prefix detected: ${detail}`);
  }
}
