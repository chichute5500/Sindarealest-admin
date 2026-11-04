import assert from "node:assert/strict";
import { assessImageBackupConfig } from "../scripts/check-image-backup-cloudflare-readonly.mjs";

const databaseId="11111111-2222-3333-4444-555555555555";
const pages={success:true,result:{
  name:"sindarealest2",production_branch:"main",
  deployment_configs:{production:{
    d1_databases:{DB:{id:databaseId}},
    r2_buckets:{
      IMAGES:{name:"sindarealest-images"},
      ORIGINALS:{name:"sindarealest-original"},
      IMAGE_BACKUPS:{name:"sin-images-backup"},
    },
  }},
}};
const managed={success:true,result:{enabled:false}};
const custom={success:true,result:{domains:[]}};
const d1={success:true,result:[{name:"sindarealest-db",uuid:databaseId}]};
assert.equal(assessImageBackupConfig(pages,managed,custom,d1).ok,true);
const badPages=structuredClone(pages);
badPages.result.deployment_configs.production.r2_buckets.IMAGE_BACKUPS={name:"sindarealest-original"};
assert.equal(assessImageBackupConfig(badPages,managed,custom,d1).ok,false);
assert.equal(assessImageBackupConfig(pages,{success:true,result:{enabled:true}},custom,d1).ok,false);
assert.equal(assessImageBackupConfig(pages,managed,{success:true,result:{domains:[{enabled:true}]}},d1).ok,false);
assert.equal(assessImageBackupConfig(pages,managed,{success:false},d1).ok,false);
assert.equal(assessImageBackupConfig(pages,managed,custom,{success:false,result:[]}).ok,false);
assert.equal(assessImageBackupConfig({...pages,result:{...pages.result,production_branch:"preview"}},managed,custom,d1).ok,false);
console.log("PASS: Cloudflare backup preflight rejects shared buckets, public access and missing D1 verification.");
