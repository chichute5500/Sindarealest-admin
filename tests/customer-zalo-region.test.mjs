import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {configuredZaloRelay,getZaloProfile} from "../functions/_zalo-profile.js";

const env={ZALO_APP_SECRET:"test-app-secret",ZALO_VN_RELAY_SECRET:"relay-test-secret-with-very-long-entropy-for-qa-only",
  ZALO_VN_RELAY_URL:"https://vn-auth.sin-owned.example.net/v1/zalo/me"};
const seen=[];
const mock=async(url,init)=>{
  seen.push({url:String(url),init});
  if(String(url).startsWith("https://graph.zalo.me/")){
    assert.equal(init.redirect,"manual");
    assert.equal(init.headers.access_token,"only-test-access-token");
    assert.match(init.headers.appsecret_proof,/^[0-9a-f]{64}$/);
    return Response.json({error:-501,message:"not for this egress"},{status:200});
  }
  assert.equal(String(url),env.ZALO_VN_RELAY_URL);
  assert.equal(init.method,"POST");
  assert.equal(init.redirect,"manual");
  const body=init.body,t=init.headers["X-SD-Time"],nonce=init.headers["X-SD-Nonce"];
  assert.ok(Math.abs(Number(t)-Date.now()/1000)<60);
  assert.match(nonce,/^[0-9a-f-]{36}$/);
  const proof=createHmac("sha256",env.ZALO_VN_RELAY_SECRET)
    .update(t+"."+nonce+"."+body).digest("hex");
  assert.equal(init.headers["X-SD-Signature"],proof);
  const data=JSON.parse(body);
  assert.equal(data.access_token,"only-test-access-token");
  assert.match(data.appsecret_proof,/^[0-9a-f]{64}$/);
  assert.ok(!String(url).includes("token"));
  return Response.json({error:0,id:"test_zalo_subject",name:"QA VN Relay"});
};
assert.equal(configuredZaloRelay(env),env.ZALO_VN_RELAY_URL);
const profile=await getZaloProfile(env,"only-test-access-token",mock);
assert.equal(profile.id,"test_zalo_subject");
assert.equal(seen.length,2,"Only retry for exact Zalo -501");

seen.length=0;
const noProxy=await getZaloProfile({ZALO_APP_SECRET:env.ZALO_APP_SECRET},"only-test-access-token",mock);
assert.equal(noProxy.error,-501,"Fail closed when Vietnam egress unavailable");
assert.equal(seen.length,1);
for(const url of [
  "http://vn-owned.example.net/v1/zalo/me",
  "https://localhost/v1/zalo/me",
  "https://sindarealest-admin-preview.pages.dev/v1/zalo/me",
  "https://evil.example.net/v1/zalo/me?redirect=other",
  "https://name:password@evil.example.net/v1/zalo/me",
  "https://vn-owned.example.net/unsafe-open-proxy"
]) assert.equal(configuredZaloRelay({...env,ZALO_VN_RELAY_URL:url}),null);

let calls=0;
const otherError=await getZaloProfile(env,"only-test-access-token",async()=>{
  calls++;return Response.json({error:-1241});
});
assert.equal(otherError.error,-1241);
assert.equal(calls,1,"Never route unrelated Zalo errors through relay");

console.log("PASS: Zalo region-specific -501 secure private relay, HMAC signing, no bypass of other failures.");
