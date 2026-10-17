import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import { onRequestPost as generateDescription } from "../functions/api/admin/ai-description.js";

const ADMIN_PASSWORD = "test-only-admin-password-long";
const SESSION_SECRET = "ai-description-binding-test-secret-long-enough";
const session = await createSession(SESSION_SECRET);

function request(body = {}) {
  return new Request("https://shop.example/api/admin/ai-description", {
    method: "POST",
    headers: {
      Cookie: "sd_admin_session=" + session,
      Origin: "https://shop.example",
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
const env = { DB: {}, ADMIN_PASSWORD, SESSION_SECRET };

let invoked = null;
const workersResponse = await generateDescription({
  request: request({
    title: "Giày da",
    category: "Giày tây",
    facts: "Màu nâu; ảnh chụp sản phẩm thực tế.",
  }),
  env: {
    ...env,
    AI: {
      async run(model, input) {
        invoked = { model, input };
        return { response: "Thiết kế màu nâu với phom dáng thanh lịch." };
      },
    },
  },
});
assert.equal(workersResponse.status, 200, "Workers AI binding must power admin description generation");
const workersPayload = await workersResponse.json();
assert.equal(workersPayload.description, "Thiết kế màu nâu với phom dáng thanh lịch.");
assert.equal(invoked.model, "@cf/meta/llama-3.2-11b-vision-instruct", "default model should match configured Cloudflare Workers AI model");
assert.equal(invoked.input.messages[1].content.includes("Màu nâu"), true, "provided product facts should be passed to the model");

let customModel = "";
await generateDescription({
  request: request({ title: "Ví da", category: "Ví", facts: "Đen" }),
  env: {
    ...env,
    WORKERS_AI_MODEL: "@cf/meta/llama-3.2-11b-vision-instruct",
    AI: { async run(model) { customModel = model; return { response: "Mô tả trung tính." }; } },
  },
});
assert.equal(customModel, "@cf/meta/llama-3.2-11b-vision-instruct", "validated configured model name should be honored");

const missingConfig = await generateDescription({
  request: request({ title: "Ví da", category: "Ví" }),
  env,
});
assert.equal(missingConfig.status, 503, "missing AI binding and OpenAI key must return explicit service configuration error");

const invalidInput = await generateDescription({
  request: request({ title: "", category: "Ví" }),
  env: { ...env, AI: { async run() { throw new Error("should not run"); } } },
});
assert.equal(invalidInput.status, 400, "invalid product input must be rejected before invoking AI");

console.log("PASS: admin description generation supports Workers AI binding, model validation, and explicit configuration errors.");
