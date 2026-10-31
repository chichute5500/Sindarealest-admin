import {publicLookupChallengeSettings} from "../_lookup-challenge.js";
// Public widget config only. Never serialize TURNSTILE_SECRET_KEY.
export async function onRequestGet({env}){
 const {available,siteKey}=publicLookupChallengeSettings(env);
 return new Response(JSON.stringify({phoneLookupAvailable:available,siteKey}),{
  status:200,
  headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
 });
}
