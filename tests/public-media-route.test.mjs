import assert from "node:assert/strict";
import { onRequestGet } from "../functions/media/[[path]].js";

function makeContext(url, { publicRef = true, object = true, includeDb = true } = {}) {
  let imageRead = 0;
  let queriedReference = "";
  const DB = {
    prepare(sql) {
      return {
        bind(value) { queriedReference = value; return this; },
        async first() {
          assert.match(sql, /published=1/);
          assert.match(sql, /instr\(images_json, \?\)/);
          return publicRef ? { allowed: 1 } : null;
        }
      };
    }
  };
  const bytes = new Uint8Array([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80]);
  const IMAGES = {
    async get(key) {
      imageRead++;
      assert.equal(key, "folder name/sample.webp");
      if (!object) return null;
      return {
        size: bytes.length,
        body: new Response(bytes).body,
        httpMetadata: { contentType: "image/webp" },
        etag: '"test-etag"'
      };
    }
  };
  return {
    context: {
      request: new Request(url),
      env: { IMAGES, ...(includeDb ? { DB } : {}) }
    },
    counts: () => ({ imageRead, queriedReference })
  };
}

const allowed = makeContext("https://preview.example/media/folder%20name/sample.webp");
const response = await onRequestGet(allowed.context);
assert.equal(response.status, 200);
assert.equal(response.headers.get("Content-Type"), "image/webp");
assert.equal(allowed.counts().imageRead, 1);
assert.equal(allowed.counts().queriedReference, "/media/folder%20name/sample.webp");

const blocked = makeContext("https://preview.example/media/folder%20name/sample.webp", { publicRef: false });
const blockedResponse = await onRequestGet(blocked.context);
assert.equal(blockedResponse.status, 404);
assert.equal(blocked.counts().imageRead, 0, "unpublished/unattached object must not be streamed");

const missing = makeContext("https://preview.example/media/folder%20name/sample.webp", { includeDb: false });
const missingResponse = await onRequestGet(missing.context);
assert.equal(missingResponse.status, 503);

const absent = makeContext("https://preview.example/media/folder%20name/sample.webp", { object: false });
const absentResponse = await onRequestGet(absent.context);
assert.equal(absentResponse.status, 404);
console.log("PASS: public media proxy exposes only images referenced by published products and supports nested R2 keys.");
