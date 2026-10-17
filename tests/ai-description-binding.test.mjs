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
const DB = {
  prepare(sql) {
    return { sql, values: [], bind(...values) { this.values = values; return this; } };
  },
  async batch() { return [{ success: true }, { success: true, results: [{ attempts: 1 }] }]; },
};
const env = { DB, ADMIN_PASSWORD, SESSION_SECRET };

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

const originalFetch = globalThis.fetch;
let openAIRequest = null;
try {
  globalThis.fetch = async (url, init) => {
    openAIRequest = { url: String(url), init };
    return new Response(JSON.stringify({
      choices: [{ message: { content: "Mô tả dự phòng từ OpenAI." } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const openAIFallback = await generateDescription({
    request: request({ title: "Ví da", category: "Ví", facts: "Màu đen" }),
    env: { ...env, OPENAI_API_KEY: "test-openai-key-that-is-long-enough" },
  });
  assert.equal(openAIFallback.status, 200, "OpenAI fallback should work when Workers AI binding is absent");
  assert.equal((await openAIFallback.json()).description, "Mô tả dự phòng từ OpenAI.");
  assert.equal(openAIRequest.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(openAIRequest.init.headers.Authorization, "Bearer test-openai-key-that-is-long-enough");
} finally {
  globalThis.fetch = originalFetch;
}

const rateLimited = await generateDescription({
  request: request({ title: "Giày da", category: "Giày tây" }),
  env: {
    DB: {
      prepare(sql) { return { sql, bind() { return this; } }; },
      async batch() { return [{ success: true }, { success: true, results: [{ attempts: 21 }] }]; },
    },
    ADMIN_PASSWORD,
    SESSION_SECRET,
    AI: { async run() { throw new Error("rate-limited AI must not be invoked"); } },
  },
});
assert.equal(rateLimited.status, 429, "AI generation must be rate-limited per IP and hour");

console.log("PASS: admin description generation supports Workers AI binding, model validation, and explicit configuration errors.");
