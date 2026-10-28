import {requireAdmin,fail} from '../../_lib.js';
import {verifyImageTicket} from '../../_taobao-official.js';

const MAX=20*1024*1024;
/**
 * Download one image returned by a signed, authorized TOP item API response.
 * Users cannot use this route as an unrestricted remote-image proxy.
 */
export async function onRequestGet(context){
  const auth=await requireAdmin(context);
  if(auth.response)return auth.response;
  const secret=context.env?.SESSION_SECRET;
  if(!secret)return fail('Thiếu cấu hình phiên quản trị.',503);
  const ticket=new URL(context.request.url).searchParams.get('ticket');
  const url=await verifyImageTicket(ticket,secret);
  if(!url)return fail('Phiên lấy ảnh hết hạn hoặc nguồn ảnh không hợp lệ. Hãy lấy danh sách ảnh lại.',403);
  let res;
  try{
    res=await fetch(url,{method:'GET',redirect:'error',headers:{Accept:'image/avif,image/webp,image/png,image/jpeg'},
      signal:AbortSignal.timeout(15000)});
  }catch{return fail('Nguồn ảnh không phản hồi hoặc chuyển hướng không được cho phép.',502);}
  if(!res.ok)return fail('Nguồn ảnh trả về lỗi ('+res.status+').',502);
  const type=res.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase()||'';
  if(!['image/png','image/jpeg','image/webp'].includes(type))return fail('Nguồn trả về dữ liệu không phải ảnh hợp lệ.',415);
  const length=Number(res.headers.get('Content-Length'));
  if(Number.isFinite(length)&&length>MAX)return fail('Ảnh lớn hơn 20 MB.',413);
  if(!res.body)return fail('Ảnh nguồn trống.',502);
  let size=0;
  const reader=res.body.getReader(), chunks=[];
  try{
    while(true){
      const next=await reader.read();
      if(next.done)break;
      size+=next.value.byteLength;
      if(size>MAX){await reader.cancel();return fail('Ảnh lớn hơn 20 MB.',413);}
      chunks.push(next.value);
    }
  }catch{return fail('Tải ảnh nguồn bị gián đoạn.',502);}
  if(!size)return fail('Ảnh nguồn trống.',502);
  const bytes=new Uint8Array(size);let offset=0;
  for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const valid=type==='image/jpeg'
    ? bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255
    :type==='image/png'
    ? bytes.length>=8&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71
    :bytes.length>=12&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
  if(!valid)return fail('Ảnh tải về không khớp định dạng.',415);
  return new Response(bytes,{status:200,headers:{
    'Content-Type':type,'Content-Disposition':'attachment; filename="taobao-product-image.'+(type==='image/jpeg'?'jpg':type==='image/png'?'png':'webp')+'"',
    'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none'",'Referrer-Policy':'no-referrer'
  }});
}
