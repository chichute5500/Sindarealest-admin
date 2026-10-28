import {fail,json,requireAdmin,readJsonBodyLimited} from '../../_lib.js';
import {itemIdFromLink,topParams,readTopImages,imageTicket} from '../../_taobao-official.js';

/**
 * Official Taobao Open Platform only. Never fetches item page HTML and never
 * accepts a client-supplied network host for fetching.
 */
export async function onRequestPost(context) {
  const auth=await requireAdmin(context);
  if(auth.response)return auth.response;
  const parsed=await readJsonBodyLimited(context.request,4096);
  if(parsed.error)return fail('Địa chỉ sản phẩm không hợp lệ hoặc quá dài.',400);
  const body=parsed.value;
  if(!body||typeof body!=='object'||Array.isArray(body))return fail('Thiếu đường dẫn Taobao.',400);
  if(body.permissionConfirmed!==true)return fail('Cần xác nhận quyền sử dụng ảnh từ nhà cung cấp.',400);
  const id=itemIdFromLink(body.link);
  if(!id)return fail('Link Taobao không hợp lệ hoặc là link rút gọn. Hãy mở Taobao, sao chép URL chi tiết có id=...',400);
  const env=context.env||{};
  if(!env.TAOBAO_APP_KEY||!env.TAOBAO_APP_SECRET||!env.SESSION_SECRET)
    return fail('Chưa kết nối API chính thức của Taobao. Cần AppKey/AppSecret có quyền đọc thông tin sản phẩm; đăng nhập Taobao trên Chrome không thay thế quyền API.',503);
  let response;
  try {
    const form=new URLSearchParams(topParams(id,env));
    response=await fetch('https://eco.taobao.com/router/rest',{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body:form.toString(),redirect:'error',signal:AbortSignal.timeout(12000)
    });
  } catch {return fail('Không kết nối được API chính thức của Taobao.',502);}
  if(!response.ok)return fail('API Taobao tạm thời không khả dụng ('+response.status+').',502);
  let data;
  try{
    const text=await response.text();
    if(text.length>512*1024)return fail('API trả về dữ liệu vượt giới hạn.',502);
    data=JSON.parse(text);
  }catch{return fail('API Taobao trả về dữ liệu không hợp lệ.',502);}
  const result=readTopImages(data);
  if(result.error)return fail(result.error==='TAOBAO_API_REJECTED'
    ?'API Taobao từ chối quyền truy cập sản phẩm. Cần cấp quyền phù hợp trong Taobao Open Platform.'
    :'API Taobao chưa cung cấp được ảnh của sản phẩm này.',422);
  const images=[];
  for(const url of result.images)images.push({preview:url,ticket:await imageTicket(url,env.SESSION_SECRET)});
  return json({ok:true,itemId:id,title:result.title,images,source:'taobao_official_api',count:images.length},
    200,{'Cache-Control':'no-store'});
}
