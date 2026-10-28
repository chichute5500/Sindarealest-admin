/**
 * Non-mutating smoke on the exact owner-provided Taobao share link.
 * Runs from a GitHub Actions Linux runner (separate from Taobao Android login).
 * Never guesses an item ID and never asserts a success if the host blocks us.
 */
import {extractTaobaoLink,resolveItemId} from '../functions/_taobao-official.js';
const share='【淘宝】大促价保 https://e.tb.cn/h.j5Ma8gaXVlwPWsu?tk=DIRtTyxDQpc CZ193 「黑色全真鳄鱼皮鞋2025新款休闲板鞋男系带低帮鞋舒适时尚真皮男鞋」 点击链接直接打开 或者 淘宝搜索直接打开';
const link=extractTaobaoLink(share);
if(link!=='https://e.tb.cn/h.j5Ma8gaXVlwPWsu?tk=DIRtTyxDQpc')throw Error('OWNER_SHARE_EXTRACT_FAILED');
console.log('OWNER_TEST: extracted exact e.tb.cn product share URL');
let requests=0;
const fetchObserved=async(url,init)=>{
  requests++;
  const res=await fetch(url,init);
  console.log('OWNER_TEST: redirect hop '+requests+' status='+res.status+
    ' host='+new URL(url).hostname+
    ' targetHost='+(()=>{try{return new URL(res.headers.get('location')||'',url).hostname}catch{return '(none)' }})());
  return res;
};
const result=await resolveItemId(share,fetchObserved);
if(result.itemId){
  console.log('OWNER_TEST: LIVE_SHORT_LINK_RESOLVED itemId='+result.itemId+
    ' redirectHops='+requests);
}else{
  console.log('OWNER_TEST: LIVE_SHORT_LINK_NOT_RESOLVED '+result.error+
    ' redirectHops='+requests);
  console.log('OWNER_TEST: Real Taobao product images NOT verified; API permission and redirect access remain necessary');
}
