import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/admin/image-groups.js";
import { createSession } from "../functions/_lib.js";

const ADMIN_PASSWORD = "classification-test-admin-password";
const SESSION_SECRET = "classification-test-session-secret-long-enough";
const session = await createSession(SESSION_SECRET);
const key = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp";
let modelCalls = 0, lastModelInput = null, malformed = false;
const DB = {
  prepare(sql) {
    return { sql, args: [], bind(...args) { this.args = args; return this; },
      async first() { return null; }, async all() { return { results: [] }; },
      async run() { return { meta: { changes: 1 } }; }
    };
  },
  async batch(statements) {
    if (statements.some(statement => statement.sql.includes("INSERT INTO public_rate_limits"))) {
      return [{ meta: { changes: 1 } }, { results: [{ attempts: 1 }] }];
    }
    return statements.map(() => ({ meta: { changes: 1 } }));
  }
};
const env = {
  DB, ADMIN_PASSWORD, SESSION_SECRET,
  IMAGES: { async head(imageKey) { return { key: imageKey }; } },
  AI: { async run(model, input) {
    modelCalls++; lastModelInput = { model, input };
    return malformed ? { response: "not valid JSON", tool_calls: [] } :
      { response: { category: "dress_shoe", confidence: 91 }, tool_calls: [], usage: {} };
  } }
};
const dataUrl = "data:image/jpeg;base64," + Buffer.from("fixture-image").toString("base64");
const request = () => new Request("https://preview.example/api/admin/image-groups", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: "sd_admin_session=" + session,
    Origin: "https://preview.example",
    "Sec-Fetch-Site": "same-origin"
  },
  body: JSON.stringify({ action: "classify-categories", imageKeys: [key], imageData: [{ key, dataUrl }] })
});
async function call() {
  const response = await onRequestPost({ request: request(), env });
  return { status: response.status, body: await response.json() };
}
const valid = await call();
assert.equal(valid.status, 200, JSON.stringify(valid.body));
assert.deepEqual(valid.body.items, [{ key, category: "dress_shoe", confidence: 91, status: "classified" }]);
assert.equal(lastModelInput.model, "@cf/meta/llama-3.2-11b-vision-instruct");
assert.equal(lastModelInput.input.image, dataUrl, "the actual image bytes must be passed in the documented vision image field");
assert.equal(typeof lastModelInput.input.messages[0].content, "string", "instructions should be text, not unsupported image_url content parts");
assert.equal(lastModelInput.input.response_format.type, "json_schema");
assert.deepEqual(lastModelInput.input.response_format.json_schema.required, ["category", "confidence"]);

malformed = true;
const invalid = await call();
assert.equal(invalid.status, 502, "malformed model output must stop classification safely");
assert.equal(invalid.body.items, undefined, "malformed output must not be accepted as a classification");
assert.equal(modelCalls, 3, "malformed output is retried once, then rejected");

// The whole-inventory scanner also accepts nested and non-WebP raster keys.
malformed = false;
const alternateKey = "catalog/shoes/loafer-front.png";
const alternateRequest = new Request("https://preview.example/api/admin/image-groups", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: "sd_admin_session=" + session,
    Origin: "https://preview.example",
    "Sec-Fetch-Site": "same-origin"
  },
  body: JSON.stringify({
    action: "classify-categories",
    imageKeys: [alternateKey],
    imageData: [{ key: alternateKey, dataUrl }]
  })
});
const alternateResponse = await onRequestPost({ request: alternateRequest, env });
const alternateBody = await alternateResponse.json();
assert.equal(alternateResponse.status, 200, JSON.stringify(alternateBody));
assert.deepEqual(alternateBody.items, [{ key: alternateKey, category: "dress_shoe", confidence: 91, status: "classified" }]);
assert.equal(modelCalls, 4, "nested PNG/JPEG-like keys must actually be sent through the vision model");

console.log("PASS: mocked Workers AI endpoint parses structured output, fails closed on malformed JSON, and accepts nested raster inventory keys.");
