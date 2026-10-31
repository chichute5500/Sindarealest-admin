// Read-only, bounded D1 server rendering for public crawler and no-JS entry.
// Do not serialize private product fields, customer data, unverified prices or inventory.
import {canonicalProductPath, PRODUCT_CATEGORY_ROUTE_SLUGS} from "./_storefront-route.js";
const h = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const validTitle = x => typeof x === "string" && x.trim().length > 0;
const validImage = x => typeof x === "string" &&
  (/^images\/[A-Za-z0-9_-]{1,120}\.webp$/.test(x) ||
   /^\/media\/[A-Za-z0-9-]{30,40}\.webp$/.test(x));
const typeLabels={in_stock:"Hàng có sẵn",made_to_order:"Hàng đặt riêng",unclassified:"Liên hệ tư vấn"};
function imageFor(row){
  let items=[];
  try{items=JSON.parse(row.images_json||"[]")}catch{}
  const image=Array.isArray(items)?items.find(validImage):"";
  return image ? (image.startsWith("/")?image:"/"+image) : "/images/theme-croc-dark.webp";
}
function productCards(rows,origin){
  return rows.map((p,i)=>{
    const href=canonicalProductPath(p);
    if(!href)return "";
    const label=typeLabels[p.fulfillment_type]||typeLabels.unclassified;
    const image=imageFor(p),title=String(p.title).trim();
    const sku=Number(p.sku_verified)===1 ? String(p.sku||"") : "";
    return '<article class="product-card sd-server-rendered" data-ssr-product="'+h(p.id)+'">'+
     '<a class="product-open" href="'+h(href)+'" aria-label="Xem chi tiết '+h(title)+'">'+
     '<span class="product-photo"><img src="'+h(image)+'" alt="'+h(title)+'" width="480" height="440" loading="'+(i<2?"eager":"lazy")+'" '+(i===0?'fetchpriority="high" ':'')+'decoding="async"></span>'+
     '<div class="product-info"><span class="sd-card-status-row"><span class="fulfillment-badge">'+h(label)+'</span>'+
     (sku?'<span class="product-sku">Mã SKU: '+h(sku)+'</span>':"")+'</span>'+
     (p.fulfillment_type==="made_to_order"?'<small class="sd-card-making-time">Làm hàng 5–20 ngày</small>':"")+
     '<h3 class="product-title">'+h(title)+'</h3></div></a></article>';
  }).join("");
}
function catalogSchema(rows,origin){
  const list=rows.map((p,i)=>({
    "@type":"ListItem",position:i+1,
    item:{"@type":"Product",name:p.title,url:origin+canonicalProductPath(p),
      image:origin+imageFor(p),brand:{"@type":"Brand",name:"SinDarealest"}}
  }));
  // Escape '<' and U+2028/U+2029 before embedding JSON into an inline script.
  return JSON.stringify({"@context":"https://schema.org","@type":"ItemList",itemListElement:list})
    .replace(/</g,"\\u003c").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");
}
export async function renderPublicCatalog(html,env,origin,{categorySlug="",home=false}={}){
  if(typeof html!=="string"||!html.includes('id="catalogGrid"')||!env?.DB)return html;
  const validCategory=categorySlug && Object.entries(PRODUCT_CATEGORY_ROUTE_SLUGS)
    .filter(([,slug])=>slug===categorySlug).map(([key])=>key);
  if(categorySlug&&!validCategory.length)return html;
  try{
    let sql="SELECT id,slug,sku,sku_verified,title,category,images_json,fulfillment_type FROM products WHERE published=1";
    const args=validCategory||[];
    if(categorySlug)sql+=" AND category IN ("+args.map(()=>"?").join(",")+")";
    sql+=" ORDER BY created_at DESC,id DESC LIMIT 8";
    let stmt=env.DB.prepare(sql);
    if(categorySlug)stmt=stmt.bind(...args);
    const result=await stmt.all();
    const rows=(Array.isArray(result?.results)?result.results:[])
      .filter(p=>p&&validTitle(p.title)&&canonicalProductPath(p)).slice(0,8);
    if(!rows.length)return html; // Never output invented/stale products if D1 is unavailable.
    const cards=productCards(rows,origin);
    html=html.replace('<div class="catalog-grid" id="catalogGrid"></div>',
      '<div class="catalog-grid" id="catalogGrid">'+cards+'</div>');
    if(home)html=html.replace('<div class="featured-grid" id="featuredGrid"></div>',
      '<div class="featured-grid" id="featuredGrid">'+productCards(rows.slice(0,4),origin)+'</div>');
    // HTML in source and no-JS has real product descriptions; JS replaces cards from /api/products.
    html=html.replace('</head>','<script type="application/ld+json">'+catalogSchema(rows,origin)+'</script>\n</head>');
    return html;
  }catch{return html} // D1 errors must not become a 500 or leak SQL details.
}
