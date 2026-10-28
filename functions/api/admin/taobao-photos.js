import {fail,json,requireAdmin,readJsonBodyLimited} from '../../_lib.js';
import {resolveItemId,topParams,readTopImages,imageTicket} from '../../_taobao-official.js';

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
  const resolved=await resolveItemId(body.link);
  if(resolved.error){
    const errors={
      INVALID_TAOBAO_SHARE_LINK:'Nội dung không có link Taobao/Tmall hợp lệ.',
      TAOBAO_ITEM_ID_NOT_FOUND:'Không tìm thấy mã sản phẩm trong link Taobao.',
      TAOBAO_SHORT_LINK_UNREACHABLE:'Không mở được link Taobao rút gọn từ máy chủ. Bạn có thể mở link trong Chrome, sao chép URL sản phẩm đầy đủ rồi dán lại.',
      TAOBAO_SHORT_LINK_UNRESOLVED:'Link rút gọn cần mở bằng Taobao/Chrome để lấy URL sản phẩm, vì Taobao không trả chuyển hướng HTTP có mã sản phẩm.',
      TAOBAO_UNSAFE_REDIRECT:'Link rút gọn chuyển sang tên miền không nằm trong Taobao/Tmall nên đã chặn.',
      TAOBAO_REDIRECT_LOOP:'Link Taobao bị lặp chuyển hướng.',
      TAOBAO_REDIRECT_LIMIT:'Link Taobao chuyển hướng quá nhiều lần.'
    };
    return fail(errors[resolved.error]||'Không giải mã được link Taobao.',422);
  }
  const id=resolved.itemId;
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
