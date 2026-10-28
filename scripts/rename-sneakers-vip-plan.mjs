// Rename only the currently published sneakers cohort; never mutate SKU or URL.
// Official SKU numeric suffix is the stable ordering source, independent of storefront shuffling.
export const SNEAKER_TITLE_PREFIX = 'Giày Thể Thao VIP Da Cá Sấu Mẫu #';
export function planSneakerTitleRename(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 500) throw Error('UNEXPECTED_SNEAKER_COUNT');
  const ids = new Set(), skus = new Set();
  const ordered = rows.map(row => {
    const id = String(row.id || '');
    const sku = String(row.sku || '');
    const title = row.title;
    const match = /^SD-SN([0-9]{3,})$/.exec(sku);
    if (!id || ids.has(id) || skus.has(sku) || !match ||
        !Number.isSafeInteger(Number(match[1])) ||
        row.category !== 'sneakers' || Number(row.published) !== 1 ||
        typeof title !== 'string' || !title.trim()) throw Error('INVALID_SNEAKER_ROW');
    ids.add(id);
    skus.add(sku);
    return { id, sku, before: title, sequence: Number(match[1]) };
  }).sort((a,b) => a.sequence - b.sequence || a.sku.localeCompare(b.sku) || a.id.localeCompare(b.id));
  return ordered.map((row, index) => ({
    id: row.id, sku: row.sku, before: row.before,
    after: SNEAKER_TITLE_PREFIX + String(index + 1).padStart(3,'0')
  }));
}
