// Owner-approved category -> official SKU prefixes (27 Oct 2026).
// Keep identifiers stable: legacy "wallets"/"Ví da" is now "Ví nam".
export const OFFICIAL_SKU_PREFIXES = Object.freeze({
  sneakers:'SD-SN', loafers:'SD-GL', 'dress-shoes':'SD-GT',
  belts:'SD-TL', sandals:'SD-DD', 'watch-straps':'SD-DH', 'phone-cases':'SD-OP',
  'vi-nam':'SD-VN', 'vi-cam-tay':'SD-VD', 'cap-tab-laptop':'SD-CA',
  clutch:'SD-CL', mu:'SD-MU', 'tui-deo-cheo':'SD-DC', 'tui-golf':'SD-TG', 'tui-nu':'SD-TN'
});
export const CATEGORY_ALIASES = Object.freeze({
  sneaker:'sneakers', 'giay-the-thao':'sneakers',
  'giay-luoi':'loafers', 'giay-tay':'dress-shoes',
  'that-lung':'belts', 'day-dong-ho':'watch-straps',
  'op-dien-thoai':'phone-cases', 'oplung':'phone-cases',
  dep:'sandals', 'vi-da':'vi-nam', vida:'vi-nam', wallets:'vi-nam',
  'vi-nam':'vi-nam', 'vi-cam-tay':'vi-cam-tay',
  'cap-tab-laptop':'cap-tab-laptop', 'cap-tap-laptop':'cap-tab-laptop',
  'tui-deo-cheo':'tui-deo-cheo', 'tui-golf':'tui-golf', 'tui-nu':'tui-nu'
});
export function normalizeCatalogCategory(value) {
  const slug=String(value||'').trim().toLocaleLowerCase('vi').replace(/đ/g,'d')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return Object.hasOwn(CATEGORY_ALIASES,slug)?CATEGORY_ALIASES[slug]:slug;
}
export function officialSkuPrefix(category) {
  const key=normalizeCatalogCategory(category);
  return Object.hasOwn(OFFICIAL_SKU_PREFIXES,key)?OFFICIAL_SKU_PREFIXES[key]:null;
}
export function officialSku(prefix,ordinal) {
  if(!Object.values(OFFICIAL_SKU_PREFIXES).includes(prefix)||!Number.isSafeInteger(ordinal)||ordinal<1||ordinal>999999)
    throw Error('Unsupported official SKU prefix or sequence');
  return prefix+String(ordinal).padStart(3,'0');
}
export function nextSkuForPrefix(rows,prefix) {
  let max=0;
  for(const row of rows||[]) {
    const sku=String(row.sku||'').trim().toUpperCase();
    if(!sku.startsWith(prefix))continue;
    const suffix=sku.slice(prefix.length);
    if(!/^\d+$/.test(suffix))continue;
    const n=Number(suffix);
    if(Number.isSafeInteger(n))max=Math.max(max,n);
  }
  return officialSku(prefix,max+1);
}

/** Default display name for newly added Giày thể thao; numbering follows the official SKU. */
export function defaultSneakerTitle(sku) {
  const match=/^SD-SN(\d{3,6})$/.exec(String(sku||'').trim().toUpperCase());
  return match?'Giày Thể Thao VIP Da Cá Sấu Mẫu #'+match[1]:'';
}
