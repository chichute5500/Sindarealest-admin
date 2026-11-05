// Admin-only buyer contact reference for checking original Facebook/Zalo sale.
const ALLOWED_HOSTS=new Set(["facebook.com","www.facebook.com","m.facebook.com","web.facebook.com","mbasic.facebook.com","fb.me","m.me","messenger.com","www.messenger.com","zalo.me","www.zalo.me"]);
export function normalizeManualWarrantyContact(value){
 if(value===undefined||value===null||value==="")return "";
 if(typeof value!=="string"||value.length>300)return null;
 const raw=value.trim();if(!raw)return "";
 const digits=raw.replace(/[().\s/-]/g,"");
 if(/^0[0-9]{9}$/.test(digits))return digits;
 if(/^(?:\+84|84)[0-9]{9}$/.test(digits))return "0"+digits.slice(-9);
 const candidate=/^(?:facebook\.com|www\.facebook\.com|m\.facebook\.com|fb\.me|m\.me|zalo\.me)\//i.test(raw)
   ?"https://"+raw:raw;
 let url;try{url=new URL(candidate)}catch{return null}
 if(url.protocol!=="https:"||url.username||url.password||url.port)return null;
 if(!ALLOWED_HOSTS.has(url.hostname)||url.pathname==="/")return null;
 return url.href.length<=300?url.href:null;
}
