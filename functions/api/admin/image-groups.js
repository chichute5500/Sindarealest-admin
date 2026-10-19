import { fail, json, rateLimitPublicRequest, readJsonBodyLimited, requireAdmin } from "../../_lib.js";
const MODEL="@cf/meta/llama-3.2-11b-vision-instruct", KEY_RE=/^(?=.{1,1024}$)[^\u0000-\u001f\u007f]+$/, LEGACY_KEY_RE=/^[A-Za-z0-9-]{30,40}\.webp$/, MAX_SCAN=2500;
function bytesToBase64(bytes){let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return btoa(binary)}
function parseVerdict(raw){const s=String(raw||"").trim().replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}$/i,"");let v;try{v=JSON.parse(s)}catch{const m=s.match(/\{[\s\S]*\}/);if(m)try{v=JSON.parse(m[0])}catch{}}if(!v||typeof v!=="object")return null;const n=Number(v.confidence);if(!Number.isFinite(n)||n<0||n>100||typeof v.same_product!=="boolean")return null;return{sameProduct:v.same_product,confidence:Math.round(n),rationale:String(v.rationale||"").trim().slice(0,900)}}
function parsePairList(value){
  if(value&&typeof value==="object"&&!Array.isArray(value)&&Array.isArray(value.pairs))return value;
  const raw=typeof value==="string"?value.trim().replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}$/i,""):"";
  let parsed=null;
  if(raw){try{parsed=JSON.parse(raw)}catch{const match=raw.match(/\{[\s\S]*\}/);if(match)try{parsed=JSON.parse(match[0])}catch{}}}
  return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)&&Array.isArray(parsed.pairs)?parsed:null;
}
function parseIndexedFeatures(row){let features={};try{features=JSON.parse(row?.features_json||"{}")}catch{}return{key:String(row?.image_key||""),pHash:String(row?.p_hash||"").toLowerCase(),features}}
function visualPairGate(left,right){
  if(!left||!right||!left.key||!right.key)return{match:false,reason:"missing_index"};
  const a=left.features||{},b=right.features||{};
  const allowed=new Set(["sneaker","loafer","dress_shoe","boot","sandal","belt","wallet","watch_strap","watch","bag","other"]);
  const categoryA=String(a.category||"").toLowerCase(),categoryB=String(b.category||"").toLowerCase();
  if(!allowed.has(categoryA)||categoryA!==categoryB||a.categoryStatus!=="classified"||b.categoryStatus!=="classified"||Number(a.categoryConfidence)<70||Number(b.categoryConfidence)<70)return{match:false,reason:"category_gate"};
  if(!/^[0-9a-f]{16}$/.test(left.pHash)||!/^[0-9a-f]{16}$/.test(right.pHash))return{match:false,reason:"invalid_phash"};
  const validArray=(value,length)=>Array.isArray(value)&&value.length===length&&value.every(item=>typeof item==="number"&&Number.isFinite(item));
  if(!validArray(a.shape,64)||!validArray(b.shape,64)||!validArray(a.colors,12)||!validArray(b.colors,12))return{match:false,reason:"invalid_descriptor"};
  const hashA=String(a.contentHash||"").toLowerCase(),hashB=String(b.contentHash||"").toLowerCase();
  const exactDuplicate=/^[0-9a-f]{64}$/.test(hashA)&&hashA===hashB;
  let distance=0;for(let i=0;i<16;i++)distance+=Number((parseInt(left.pHash[i],16)^parseInt(right.pHash[i],16)).toString(2).replace(/0/g,"").length);
  if(exactDuplicate)return{match:true,score:100,exactDuplicate:true,distance};
  let shapeDelta=0;for(let i=0;i<64;i++)shapeDelta+=Math.abs(a.shape[i]-b.shape[i]);
  const shape=Math.max(0,Math.min(1,1-shapeDelta/64));
  let colorOverlap=0;for(let channel=0;channel<3;channel++){let channelOverlap=0;for(let bin=0;bin<4;bin++){const i=channel*4+bin;channelOverlap+=Math.min(Number(a.colors[i])||0,Number(b.colors[i])||0)}colorOverlap+=Math.max(0,Math.min(1,channelOverlap))}
  const color=colorOverlap/3,score=Math.round(((1-distance/64)*0.30+shape*0.35+color*0.35)*100);
  return{match:score>=70&&shape>=0.58&&color>=0.58&&distance<=24,score,shape,color,distance,exactDuplicate:false};
}

export function parseCategoryResult(result, allowed = new Set(["sneaker","loafer","dress_shoe","boot","sandal","belt","wallet","watch_strap","watch","bag","other","unknown"])) {
  const candidates = [];
  const visitedObjects = new Set();
  const visitedStrings = new Set();
  let visited = 0;

  const aliases = {
    sneakers:"sneaker", sneaker_shoes:"sneaker", trainers:"sneaker", trainer:"sneaker", running_shoes:"sneaker", athletic_shoes:"sneaker", giay_the_thao:"sneaker",
    loafers:"loafer", loafer_shoes:"loafer", slip_on_shoes:"loafer", giay_luoi:"loafer",
    dress_shoes:"dress_shoe", dressshoe:"dress_shoe", formal_shoe:"dress_shoe", formal_shoes:"dress_shoe", giay_tay:"dress_shoe",
    boots:"boot", sandals:"sandal", belts:"belt", that_lung:"belt", wallets:"wallet", vi:"wallet",
    watchstraps:"watch_strap", watch_band:"watch_strap", watch_bands:"watch_strap", watchbands:"watch_strap", day_dong_ho:"watch_strap",
    watches:"watch", dong_ho:"watch", bags:"bag", tui:"bag", shoe:"unknown", shoes:"unknown", footwear:"unknown", footwear_product:"unknown", unknown_product:"unknown", unknown_item:"unknown", khong_xac_dinh:"unknown", other_product:"other", khac:"other"
  };
  const normalize = value => {
    if (value && typeof value === "object") value = value.category ?? value.label ?? value.name ?? value.value ?? value.text;
    let category = String(value ?? "").trim().toLowerCase()
      .replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[ -]+/g, "_").replace(/[^a-z_]/g, "").replace(/^_+|_+$/g, "");
    category = aliases[category] || category;
    return allowed.has(category) ? category : null;
  };
  const scalar = value => {
    if (value && typeof value === "object") return value.value ?? value.score ?? value.confidence ?? value.number ?? null;
    return value;
  };
  const confidenceValue = value => {
    value = scalar(value);
    if (typeof value === "string") value = value.trim().replace(/%$/, "");
    let confidence = Number(value);
    if (Number.isFinite(confidence) && confidence > 0 && confidence <= 1) confidence *= 100;
    return Number.isFinite(confidence) && confidence >= 0 && confidence <= 100 ? Math.round(confidence) : null;
  };
  const evaluateObject = value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const categoryRaw = value.category ?? value.product_category ?? value.productCategory ?? value.product_type ?? value.label ?? value.type;
    const category = normalize(categoryRaw);
    const confidence = confidenceValue(value.confidence ?? value.score ?? value.confidence_score ?? value.confidenceScore ?? value.confidence_percent ?? value.probability);
    return category && confidence !== null ? { category, confidence } : null;
  };
  const parseText = raw => {
    const text = raw.trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/i, "").trim();
    if (!text) return null;
    const candidatesToParse = [text];
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch && objectMatch[0] !== text) candidatesToParse.push(objectMatch[0]);
    for (const candidate of candidatesToParse) {
      try {
        const parsed = JSON.parse(candidate);
        const direct = evaluateObject(parsed);
        if (direct) return direct;
        collect(parsed, 1);
      } catch {}
    }
    const categoryPatterns = [
      [/\bwatch[ _-]?strap\b|\bwatch[ _-]?band\b|\bday dong ho\b/i, "watch_strap"],
      [/\bdress[ _-]?shoe(?:s)?\b|\bformal[ _-]?shoe(?:s)?\b|\bgiay tay\b/i, "dress_shoe"],
      [/\bsneakers?\b|\btrainers?\b|\brunning shoes\b|\bgiay the thao\b/i, "sneaker"],
      [/\bloafers?\b|\bgiay luoi\b/i, "loafer"],
      [/\bboots?\b/i, "boot"], [/\bsandals?\b/i, "sandal"], [/\bbelts?\b|\bthat lung\b/i, "belt"],
      [/\bwallets?\b|\bvi\b/i, "wallet"], [/\bwatches?\b|\bdong ho\b/i, "watch"], [/\bbags?\b|\btui\b/i, "bag"],
      [/\bunknown\b|\bkhong xac dinh\b/i, "unknown"], [/\bother\b|\bkhac\b/i, "other"]
    ];
    const confidenceMatch = text.match(/(?:confidence|score|confidence_score|confidenceScore|độ[_ ]tin[_ ]cậy|do[_ ]tin[_ ]cay|probability)\s*[ "'\x60]*[:=]\s*[ "'\x60]*([0-9]+(?:\.[0-9]+)?)\s*%?/i);
    if (confidenceMatch) {
      const confidence = confidenceValue(confidenceMatch[1]);
      if (confidence !== null) {
        for (const [pattern, name] of categoryPatterns) {
          if (pattern.test(text)) {
            const category = normalize(name);
            if (category) return { category, confidence };
          }
        }
      }
    }
    return null;
  };
  function collect(value, depth = 0) {
    if (depth > 8 || value == null || visited++ > 300) return;
    if (typeof value === "string") {
      const raw = value.trim();
      if (!raw || visitedStrings.has(raw)) return;
      visitedStrings.add(raw);
      const parsed = parseText(raw);
      if (parsed) candidates.push(parsed);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 20)) collect(item, depth + 1);
      return;
    }
    if (typeof value !== "object" || visitedObjects.has(value)) return;
    visitedObjects.add(value);
    const parsed = evaluateObject(value);
    if (parsed) candidates.push(parsed);
    // Workers AI can put generated JSON in response, in content parts, or in
    // function-call arguments. Walk bounded nested payloads instead of guessing
    // that response is always a plain string.
    const preferred = ["response","tool_calls","content","text","generated_text","output_text","result","message","choices","output","function","arguments","args","input","data","json","parsed","payload"];
    for (const key of preferred) if (Object.prototype.hasOwnProperty.call(value, key)) collect(value[key], depth + 1);
    for (const [key, child] of Object.entries(value)) {
      if (preferred.includes(key) || ["usage","timings","metrics","logprobs","id","created","model","object","finish_reason"].includes(key)) continue;
      collect(child, depth + 1);
    }
  }

  collect(result);
  return candidates[0] || null;
}

function normalizeOwnedImageKey(reference){
  let value=String(reference||"").trim();
  if(!value)return "";
  if(/^https?:\/\//i.test(value)){try{value=new URL(value).pathname}catch{return ""}}
  value=value.split(/[?#]/,1)[0];
  try{value=decodeURIComponent(value)}catch{}
  value=value.replace(/^\/+/,"");
  if(value.startsWith("media/"))value=value.slice(6);
  return value;
}
async function ownersForImageKeys(env,keys){
  const wanted=new Set(keys),owners=new Map();let offset=0;
  while(true){
    const page=await env.DB.prepare("SELECT id,sku,images_json FROM products ORDER BY sku ASC,id ASC LIMIT 500 OFFSET ?").bind(offset).all();
    const rows=page.results||[];
    for(const product of rows){let refs=[];try{refs=JSON.parse(product.images_json||"[]")}catch{}
      for(const reference of Array.isArray(refs)?refs:[]){const key=normalizeOwnedImageKey(reference);if(!wanted.has(key))continue;
        if(!owners.has(key))owners.set(key,new Set());owners.get(key).add(String(product.sku||product.id||""));
      }
    }
    if(rows.length<500)break;offset+=rows.length;
  }
  return owners;
}
async function inventory(env){const ps=[];let productOffset=0;while(true){const page=await env.DB.prepare("SELECT id,sku,title,images_json FROM products ORDER BY sku ASC, id ASC LIMIT 500 OFFSET ?").bind(productOffset).all();const rows=page.results||[];ps.push(...rows);if(rows.length<500)break;productOffset+=rows.length}const assigned=new Map();for(const p of ps){let arr=[];try{arr=JSON.parse(p.images_json||"[]")}catch{}for(const entry of Array.isArray(arr)?arr:[]){const s=String(entry||""),m=s.match(/(?:^|\/)media\/([A-Za-z0-9-]{30,40}\.webp)(?:[?#].*)?$/i)||s.match(/^([A-Za-z0-9-]{30,40}\.webp)$/i);if(m){if(!assigned.has(m[1]))assigned.set(m[1],[]);assigned.get(m[1]).push({id:p.id,sku:p.sku,title:p.title})}}}const images=[];let cursor,scannedObjects=0,webpObjects=0,rejectedWebpCount=0;const sampleRejectedKeys=[];do{const page=await env.IMAGES.list({limit:1000,...(cursor?{cursor}:{})});for(const o of page.objects||[]){scannedObjects++;const key=String(o.key||"");if(/\.webp$/i.test(key))webpObjects++;if(LEGACY_KEY_RE.test(key))images.push({key,url:"/media/"+encodeURIComponent(key),size:Number(o.size||0),uploaded:o.uploaded?new Date(o.uploaded).toISOString():null,assignedTo:assigned.get(key)||[]});else if(/\.webp$/i.test(key)){rejectedWebpCount++;if(sampleRejectedKeys.length<5)sampleRejectedKeys.push(key.slice(0,120))}if(images.length>=MAX_SCAN)break}if(images.length>=MAX_SCAN||!page.truncated)break;cursor=page.cursor}while(cursor);return{images,truncated:images.length>=MAX_SCAN,total:images.length,assignedCount:images.filter(x=>x.assignedTo.length).length,diagnostics:{scannedObjects,webpObjects,rejectedWebpCount,sampleRejectedKeys,scanLimit:MAX_SCAN}}}
export async function onRequestGet({request,env}){const auth=await requireAdmin({request,env});if(auth.response)return auth.response;if(!env.DB||!env.IMAGES)return fail("Thiếu binding D1 DB hoặc R2 IMAGES.",503);try{const [stock,rows]=await Promise.all([inventory(env),env.DB.prepare("SELECT id,image_a,image_b,same_product,confidence,rationale,status,product_id,created_at FROM image_group_reviews ORDER BY created_at DESC LIMIT 200").all()]);return json({...stock,reviews:rows.results||[]})}catch{return fail("Không thể kiểm kê kho ảnh. Kiểm tra binding R2 IMAGES và migration 0008.",503)}}
export async function onRequestPost(context){const auth=await requireAdmin(context);if(auth.response)return auth.response;const env=context.env||{};if(!env.DB||!env.IMAGES)return fail("Thiếu binding D1 DB hoặc R2 IMAGES.",503);const parsed=await readJsonBodyLimited(context.request,3*1024*1024);if(parsed.error==="too_large")return fail("Yêu cầu vượt giới hạn.",413);if(parsed.error||!parsed.value||typeof parsed.value!=="object"||Array.isArray(parsed.value))return fail("Yêu cầu không hợp lệ.");const body=parsed.value,action=String(body.action||"");
if(action==="classify-categories"){
if(typeof env.AI?.run!=="function")return fail("Chưa cấu hình Workers AI binding AI trên Preview. Phân loại bị dừng an toàn.",503);
const keys=Array.isArray(body.imageKeys)?body.imageKeys.map(x=>String(x||"")):[];
const supplied=Array.isArray(body.imageData)?body.imageData:[];
if(!keys.length||keys.length>8||new Set(keys).size!==keys.length||keys.some(k=>!KEY_RE.test(k)))return fail("Lô phân loại cần từ 1 đến 8 ảnh khác nhau.",400);
if(supplied.length!==keys.length||supplied.some((x,i)=>!x||x.key!==keys[i]||typeof x.dataUrl!=="string"||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(x.dataUrl)||x.dataUrl.length>250000))return fail("Dữ liệu ảnh xem trước không hợp lệ.",400);
if(supplied.reduce((sum,x)=>sum+x.dataUrl.length,0)>1200000)return fail("Lô ảnh vượt giới hạn 1,2 MB.",413);
try{
const objects=await Promise.all(keys.map(k=>env.IMAGES.head?env.IMAGES.head(k):env.IMAGES.get(k)));
if(objects.some(x=>!x))return fail("Ảnh đã biến mất khỏi R2; hãy quét lại kho.",409);
const limit=await rateLimitPublicRequest(env,context.request,"admin_image_category_classify",700,3600);
if(limit.limited)return fail("Đã đạt giới hạn phân loại ảnh trong một giờ. Hãy đợi rồi quét tiếp; kết quả chưa rõ sẽ không được gom.",429,{"Retry-After":"3600"});
const prompt="Phân loại vật thể chính trong ảnh thành ĐÚNG MỘT category trong danh sách: sneaker, loafer, dress_shoe, boot, sandal, belt, wallet, watch_strap, watch, bag, other, unknown. Không được trả category chung chung như shoe, shoes hoặc footwear. Nếu là giày, bắt buộc chọn sneaker (giày thể thao), loafer (giày lười), dress_shoe (giày tây/giày công sở), boot (bốt) hoặc sandal; chỉ chọn unknown nếu ảnh không đủ rõ để phân biệt. watch_strap là dây đồng hồ riêng lẻ; watch là đồng hồ nguyên chiếc. Không suy đoán chỉ từ nền ảnh. Trả đúng JSON object gồm category và confidence; confidence là số nguyên 0-100. Không gọi tool, không markdown, không giải thích.";
const allowed=new Set(["sneaker","loafer","dress_shoe","boot","sandal","belt","wallet","watch_strap","watch","bag","other","unknown"]);
const items=[];
for(let i=0;i<keys.length;i++){
let result,classification=null;
for(let attempt=0;attempt<2&&!classification;attempt++){
  try{
    // The live Preview smoke test showed that the vision binding rejects the
    // schema-constrained, user-only request with AI error 3030. Use the documented
    // system + user message shape that passed real inference, then validate JSON
    // strictly with parseCategoryResult before storing any classification.
    result=await env.AI.run(MODEL,{
      messages:[
        {role:"system",content:"You are a strict product image classification engine. Follow the user's category list exactly. Return one JSON object only, with category and integer confidence from 0 to 100. Never add markdown or explanation."},
        {role:"user",content:prompt+(attempt===1?"\nReturn only the JSON object. No explanation, no markdown, no extra keys.":"")}
      ],
      image:supplied[i].dataUrl,
      temperature:0,
      max_tokens:180
    });
  }catch(error){
    const detail=String(error?.message||error).replace(/[\r\n]+/g," ").slice(0,180);
    const upstreamStatus=Number(error?.status||error?.statusCode||error?.status_code||0);
    const quota=upstreamStatus===429||/\b429\b|too many requests|rate.?limit|quota exceeded/i.test(detail);
    const transient=upstreamStatus===500||upstreamStatus===502||upstreamStatus===503||upstreamStatus===504||
      /\b(500|502|503|504)\b|time.?out|temporar|unavailable|overloaded|network error|internal server error/i.test(detail);
    // Do not hammer a quota-limited model. Retry one transient upstream failure only.
    if(attempt===0&&transient&&!quota){
      await new Promise(resolve=>setTimeout(resolve,250));
      continue;
    }
    const status=quota?429:(transient?503:502);
    const message="Workers AI lỗi khi phân loại ảnh "+(i+1)+"/"+keys.length+": "+detail+". Lô này chưa được đánh dấu phân loại xong; hãy thử quét lại.";
    return fail(message,status,quota?{"Retry-After":"60"}:{});
  }
  classification=parseCategoryResult(result,allowed);
}
if(!classification){const source=result&&typeof result==="object"?result:{};const describe=(key,value)=>key+(Array.isArray(value)?"["+value.length+"]":value&&typeof value==="object"?"{"+Object.keys(value).slice(0,6).join(",")+"}":"("+typeof value+")");const shape=Object.entries(source).slice(0,8).map(([key,value])=>describe(key,value)).join(",")||typeof result;let sample="";try{sample=JSON.stringify({response:source.response,tool_calls:source.tool_calls,choices:Array.isArray(source.choices)?source.choices.slice(0,1):undefined,output_text:source.output_text})||""}catch{}sample=sample.replace(/[\\r\\n]+/g," ").slice(0,220);return fail("Workers AI trả phản hồi không hợp lệ cho ảnh "+(i+1)+"/"+keys.length+" (dạng: "+shape+(sample?"; mẫu JSON: "+sample:"")+"). Không lưu lô này; hãy thử lại.",502)}
const candidate=classification.category,confidence=classification.confidence,valid=candidate!=="unknown"&&confidence>=70;
items.push({key:keys[i],category:valid?candidate:"unknown",confidence:Math.round(confidence),status:valid?"classified":"needs_review"});
}
return json({ok:true,items,message:"Đã phân loại "+items.filter(x=>x.category!=="unknown").length+"/"+items.length+" ảnh. Ảnh chưa đủ chắc chắn được giữ ở trạng thái chưa xác định."});
}catch(error){return fail("Không thể phân loại ảnh. "+String(error?.message||error).replace(/[\r\n]+/g," ").slice(0,180),502)}
}
if(action==="compare"){
  if(typeof env.AI?.run!=="function")return fail("Chưa cấu hình Workers AI binding tên AI trên Preview. Chưa gọi AI và chưa lưu kết quả.",503);
  const keys=Array.isArray(body.imageKeys)?body.imageKeys.map(x=>String(x||"")):[String(body.imageA||""),String(body.imageB||"")];
  if(keys.length<2||keys.length>8||new Set(keys).size!==keys.length||keys.some(k=>!KEY_RE.test(k)))return fail("Chọn từ 2 đến 8 ảnh khác nhau trong kho ảnh.");
  try{
    const objects=await Promise.all(keys.map(k=>env.IMAGES.get(k)));
    if(objects.some(x=>!x))return fail("Một hoặc nhiều ảnh không còn tồn tại trong R2.",404);
    const supplied=Array.isArray(body.imageData)?body.imageData:[];
    if(supplied.length!==keys.length||supplied.some((x,i)=>!x||x.key!==keys[i]||typeof x.dataUrl!=="string"||!/^data:image\\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(x.dataUrl)))return fail("Không nhận được ảnh JPEG đã chuyển đổi từ trình duyệt. Hãy tải lại trang và thử lại.",400);
    if(supplied.some(x=>x.dataUrl.length>700000))return fail("Ảnh sau chuyển đổi vẫn quá lớn. Hãy thử ảnh nhỏ hơn.",413);
    const limit=await rateLimitPublicRequest(env,context.request,"admin_image_group_compare",30,3600);
    if(limit.limited)return fail("Đã đạt giới hạn 30 lượt tìm nhóm AI mỗi giờ. Vui lòng thử lại sau.",429,{"Retry-After":"3600"});
    const indexedResult=await env.DB.prepare("SELECT image_key,p_hash,features_json FROM image_group_index WHERE image_key IN ("+keys.map(()=>"?").join(",")+")").bind(...keys).all();
    const indexedByKey=new Map((indexedResult.results||[]).map(row=>{const parsed=parseIndexedFeatures(row);return[parsed.key,parsed]}));
    const promptBase="Bạn là chuyên gia đối chiếu ảnh sản phẩm. Hãy tìm các cặp có bằng chứng đủ mạnh rằng chúng chụp CÙNG MỘT SẢN PHẨM VẬT LÝ, không phải chỉ cùng mẫu hoặc kiểu dáng. Với giày, đối chiếu vân da/cá sấu, đường may, logo, khóa, mũi giày, đế, lỗ dây và dấu hiệu sản xuất; với phụ kiện, đối chiếu chất liệu, hình dáng, đường may, khóa, logo và dấu hiệu riêng. Góc chụp, ánh sáng, nền và khoảng cách có thể khác. Chỉ đưa vào kết quả các cặp có bằng chứng đủ mạnh; bỏ qua cặp chỉ giống kiểu dáng. Trả duy nhất JSON có trường pairs là mảng đối tượng; mỗi đối tượng có trường a, b (chỉ số ảnh), same_product (boolean), confidence (số 0-100), rationale (lý do ngắn bằng tiếng Việt).";
    const ownersByKey=await ownersForImageKeys(env,keys),prepared=[],seen=new Set();
    async function runVisionWithRetry(input){
      for(let attempt=0;attempt<2;attempt++){
        try{return await env.AI.run(MODEL,input)}
        catch(error){
          const detail=String(error?.message||error||"Unknown Workers AI error").replace(/[\\r\\n]+/g," ").slice(0,180);
          const upstreamStatus=Number(error?.status||error?.statusCode||error?.status_code||0);
          const quota=upstreamStatus===429||/\\b429\\b|too many requests|rate.?limit|quota exceeded/i.test(detail);
          const transient=[500,502,503,504].includes(upstreamStatus)||/\\b(500|502|503|504)\\b|time.?out|temporar|unavailable|overloaded|network error|internal server error/i.test(detail);
          if(quota){error.status=429;throw error}
          if(attempt===0&&transient&&!/\\b3030\\b/.test(detail)){await new Promise(resolve=>setTimeout(resolve,250));continue}
          error.status=transient?503:upstreamStatus||502;
          throw error;
        }
      }
      throw new Error("Workers AI did not return a result");
    }
    // Analyze every selected image exactly once as a vision input. Do not
    // compare isolated four-image windows: for eight images that silently
    // misses pairs at opposite ends of the selection.
    const descriptors=[];
    for(let imageIndex=0;imageIndex<keys.length;imageIndex++){
      const vision=await runVisionWithRetry({
        messages:[
          {role:"system",content:"You are a forensic product-photo analyst. Describe only visible, distinguishing physical details in concise Vietnamese. For shoes include product type, material and texture (including crocodile pattern only if visibly present), toe shape, sole profile, stitching, logo placement, laces/buckles, color and unique marks. For accessories describe visible material, silhouette, seams, hardware, logo and unique marks. Do not infer hidden details. Return a compact JSON object only."},
          {role:"user",content:"Describe this product image so it can be compared with photos of a possibly identical physical product."}
        ],
        image:supplied[imageIndex].dataUrl,
        temperature:0,
        max_tokens:220
      });
      const descriptorText=vision?.response??vision?.choices?.[0]?.message?.content??vision?.output_text;
      if(typeof descriptorText!=="string"||!descriptorText.trim())throw new Error("single-image descriptor was empty");
      descriptors.push(descriptorText.trim().slice(0,2200));
    }
    const comparisonMessages=[
      {role:"system",content:"Compare all supplied visual descriptions. Check every pair in the complete list, including pairs far apart in the list. Decide which show the SAME physical product, not merely similar styles. View angle, lighting and background may differ; different material pattern, stitching, logo, sole, hardware or unique marks are evidence against a match. Use zero-based indices matching the labels exactly. Return only valid JSON: {\\"pairs\\":[{\\"a\\":0,\\"b\\":1,\\"same_product\\":true,\\"confidence\\":91,\\"rationale\\":\\"brief Vietnamese reason\\"}]}. Include only credible same-product pairs with confidence >= 91; never pair an image with itself. Return an empty pairs array if no pair qualifies."},
      {role:"user",content:promptBase+"\\n\\n"+descriptors.map((description,index)=>"Ảnh "+index+" (mã "+keys[index]+", mô tả từ phân tích thị giác):\\n"+description).join("\\n\\n")+"\\n\\nCó "+keys.length+" ảnh trong danh sách. Kiểm tra TẤT CẢ các cặp i<j, bao gồm ảnh đầu và ảnh cuối. Chỉ trả JSON, chỉ đề xuất cặp có confidence từ 91 trở lên."}
    ];
    let compared=await runVisionWithRetry({messages:comparisonMessages,temperature:0,max_tokens:1400});
    let comparedText=compared?.response??compared?.choices?.[0]?.message?.content??compared?.output_text;
    if(!parsePairList(comparedText)){
      compared=await runVisionWithRetry({
        messages:[
          {role:"system",content:"Return ONLY valid JSON with a top-level pairs array. Each pair must have numeric a and b indices, boolean same_product, integer confidence 0-100, and a short Vietnamese rationale. No markdown or explanation. Only report confidence >= 91 and inspect every pair from the full image-description list."},
          {role:"user",content:"The previous response was malformed. Re-evaluate the complete list below, checking all pairs including first-to-last. Return valid JSON only. "+promptBase+"\\n\\n"+descriptors.map((description,index)=>"Ảnh "+index+" (mã "+keys[index]+"):\\n"+description).join("\\n\\n")}
        ],
        temperature:0,
        max_tokens:1400
      });
      comparedText=compared?.response??compared?.choices?.[0]?.message?.content??compared?.output_text;
    }
    let parsedPairs=parsePairList(comparedText);
    if(!parsedPairs)throw new Error("text comparison response did not contain a valid pairs array after one format retry");
    if(typeof comparedText!=="string")comparedText=JSON.stringify(parsedPairs);
    for(const pair of parsedPairs.pairs){
      const a=Number(pair?.a),b=Number(pair?.b),confidence=Number(pair?.confidence);
      if(pair?.same_product!==true||!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=keys.length||b>=keys.length||a===b||!Number.isFinite(confidence)||confidence<91||confidence>100)continue;
      const visual=visualPairGate(indexedByKey.get(keys[a]),indexedByKey.get(keys[b]));
      if(!visual.match)continue;
      const first=keys[a]<keys[b]?keys[a]:keys[b],second=keys[a]<keys[b]?keys[b]:keys[a],id=first+"|"+second;
      const ownerA=ownersByKey.get(first)||new Set(),ownerB=ownersByKey.get(second)||new Set();
      if(ownerA.size>1||ownerB.size>1||(ownerA.size===1&&ownerB.size===1&&[...ownerA][0]!==[...ownerB][0]))continue;
      if(seen.has(id))continue;
      seen.add(id);
      prepared.push({first,second,confidence:Math.round(confidence),rationale:String(pair.rationale||"").trim().slice(0,900)});
    }
    if(!prepared.length)return json({ok:true,matches:[],batches:1,message:"AI chưa tìm thấy cặp nào đủ bằng chứng trong toàn bộ "+keys.length+" ảnh đã kiểm tra. Có thể chạy lại với cặp ảnh nghi vấn; không có đề xuất nào được lưu."});
    const statements=prepared.map(p=>env.DB.prepare("INSERT INTO image_group_reviews(id,image_a,image_b,same_product,confidence,rationale,status,created_at) VALUES(?,?,?,1,?,?,'pending',datetime('now'))").bind(crypto.randomUUID(),p.first,p.second,p.confidence,p.rationale));
    await env.DB.batch(statements);
    return json({ok:true,matches:prepared.length,batches:1,message:"AI đã so sánh đầy đủ "+keys.length+" ảnh và tạo "+prepared.length+" cặp đề xuất sau khi kiểm tra ngưỡng và đặc trưng. Các đề xuất đang chờ bạn duyệt; chưa ảnh nào được tự động công khai."},201);
  }catch(error){
    const detail=String(error?.message||error||"Unknown Workers AI error").replace(/[\\r\\n]+/g," ").slice(0,220);
    const status=Number(error?.status||error?.statusCode||error?.status_code||0);
    if(status===429||/\\b429\\b|quota exceeded|rate.?limit/i.test(detail))return fail("Workers AI đã giới hạn hoặc hết hạn mức khi so sánh ảnh. Chưa lưu đề xuất; hãy thử lại sau.",429,{"Retry-After":"60"});
    return fail("Không thể so sánh đủ các ảnh bằng Workers AI: "+detail+". Chưa lưu đề xuất nào.",status===503?503:502);
  }
}
if(action==="reject"){const id=String(body.reviewId||"");if(!/^[0-9a-f-]{36}$/i.test(id))return fail("Mã lượt duyệt không hợp lệ.");const r=await env.DB.prepare("UPDATE image_group_reviews SET status='rejected' WHERE id=? AND status='pending'").bind(id).run();if(!r.meta?.changes)return fail("Lượt duyệt không tồn tại hoặc đã được xử lý.",409);return json({ok:true,message:"Đã loại đề xuất này."})}
if(action==="approve"){const id=String(body.reviewId||""),productId=String(body.productId||"");if(!/^[0-9a-f-]{36}$/i.test(id)||!productId||productId.length>120)return fail("Thiếu lượt duyệt hoặc sản phẩm đích.");const review=await env.DB.prepare("SELECT * FROM image_group_reviews WHERE id=? AND status='pending' AND same_product=1 AND confidence>=91").bind(id).first();if(!review)return fail("Chỉ có thể duyệt đề xuất AI đánh giá cùng sản phẩm với độ tin cậy từ 91% trở lên.",409);const product=await env.DB.prepare("SELECT * FROM products WHERE id=? LIMIT 1").bind(productId).first();if(!product)return fail("Không tìm thấy sản phẩm đích.",404);let images;const previousImagesJson=String(product.images_json??"[]");try{images=JSON.parse(previousImagesJson)}catch{return fail("Dữ liệu ảnh hiện tại của sản phẩm không hợp lệ. Không ghi đè để tránh mất dữ liệu.",409)}if(!Array.isArray(images)||images.some(value=>typeof value!=="string"))return fail("Danh sách ảnh hiện tại không hợp lệ. Không ghi đè dữ liệu cũ.",409);const keys=[review.image_a,review.image_b],others=await env.DB.prepare("SELECT id,sku,images_json FROM products WHERE id<>?").bind(productId).all(),owners=new Map();for(const row of others.results||[]){let refs=[];try{refs=JSON.parse(row.images_json||"[]")}catch{}for(const ref of Array.isArray(refs)?refs:[])for(const key of keys)if(String(ref||"").includes(key))owners.set(key,row.sku)}if(keys.some(k=>owners.has(k)))return fail("Một ảnh đã thuộc SKU khác. Hãy kiểm tra và gỡ liên kết cũ trước để tránh ghép nhầm sản phẩm.",409);const known=new Set(images.map(String));for(const key of keys){const url="/media/"+key;if(!known.has(url)&&!known.has(url.slice(1))&&!known.has(key))images.push(url)}if(images.length>30)return fail("Bộ ảnh sản phẩm đã đạt giới hạn 30 ảnh.",409);const nextImagesJson=JSON.stringify(images);const results=await env.DB.batch([env.DB.prepare("UPDATE products SET images_json=?,updated_at=datetime('now') WHERE id=? AND COALESCE(images_json,'[]')=? AND EXISTS (SELECT 1 FROM image_group_reviews WHERE id=? AND status='pending' AND same_product=1 AND confidence>=91)").bind(nextImagesJson,productId,previousImagesJson,id),env.DB.prepare("UPDATE image_group_reviews SET status='approved',product_id=? WHERE id=? AND status='pending' AND changes()=1").bind(productId,id),env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?, 'admin', 'image_group_approved', 'product', ?, ? WHERE changes()=1 AND EXISTS (SELECT 1 FROM image_group_reviews WHERE id=? AND status='approved' AND product_id=?)").bind(crypto.randomUUID(),productId,JSON.stringify({reviewId:id,keys,sku:product.sku,previousImagesJson,nextImagesJson}),id,productId)]);if(!results?.[0]?.meta?.changes||!results?.[1]?.meta?.changes)return fail("Sản phẩm hoặc đề xuất đã thay đổi đồng thời. Không ghi đè; hãy tải lại và kiểm tra.",409);return json({ok:true,message:"Đã thêm ảnh vào bộ ảnh sản phẩm.",sku:product.sku,imageCount:images.length})}
return fail("Thao tác không được hỗ trợ.")}
export async function onRequestDelete(){return fail("Phương thức không được hỗ trợ.",405)}
