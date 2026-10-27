import { officialSkuPrefix, officialSku } from '../functions/_catalog-sku.js';

// Pure, repeatable plan: published products only; hidden rows are delete candidates.
// Stable assignment avoids random catalog shuffling or timestamp edits changing SKU.
export function planCatalogCutover(rows) {
  if(!Array.isArray(rows)||rows.length<1||rows.length>3000)throw Error('CATALOG_UNEXPECTED_ROWCOUNT');
  const published=rows.filter(r=>Number(r.published)===1);
  const hidden=rows.filter(r=>Number(r.published)===0);
  if(published.length+hidden.length!==rows.length||published.length<1)throw Error('CATALOG_VISIBILITY_INVALID');
  const ids=published.map(r=>String(r.id||''));
  if(ids.some(x=>!x)||new Set(ids).size!==ids.length)throw Error('CATALOG_DUPLICATE_ID');
  const activeCategories=new Set(published.map(r=>String(r.category)));
  if(activeCategories.size!==15)throw Error('CATALOG_EXPECTED_15_CATEGORIES');
  const groups=new Map();
  for(const p of published) {
    const prefix=officialSkuPrefix(p.category);
    if(!prefix)throw Error('CATALOG_UNAPPROVED_CATEGORY: '+String(p.category).slice(0,70));
    if(!groups.has(prefix))groups.set(prefix,[]);
    groups.get(prefix).push(p);
  }
  if(groups.size!==15)throw Error('CATALOG_PREFIX_COLLISION_OR_MISSING_GROUP');
  const planned=[];
  for(const [prefix,group] of groups) {
    group.sort((a,b)=>(Number(a.sort_order||0)-Number(b.sort_order||0))
      ||String(a.created_at||'').localeCompare(String(b.created_at||''))
      ||String(a.id).localeCompare(String(b.id)));
    for(let i=0;i<group.length;i++)planned.push({id:String(group[i].id),sku:officialSku(prefix,i+1)});
  }
  if(new Set(planned.map(p=>p.sku)).size!==planned.length)throw Error('CATALOG_SKU_COLLISION');
  return {published,hidden,planned};
}
