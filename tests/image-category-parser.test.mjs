import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseCategoryResult } from "../functions/api/admin/image-groups.js";

const allowed = new Set([
  "sneaker", "loafer", "dress_shoe", "boot", "sandal", "belt",
  "wallet", "watch_strap", "watch", "bag", "other", "unknown"
]);

// Native binding can return a structured response object instead of a string.
assert.deepEqual(
  parseCategoryResult({
    response: { category: "sneaker", confidence: 94 },
    tool_calls: [],
    usage: { prompt_tokens: 200 }
  }, allowed),
  { category: "sneaker", confidence: 94 }
);

// Some model responses carry the classification in tool-call arguments.
assert.deepEqual(
  parseCategoryResult({
    response: "",
    tool_calls: [{
      name: "classify_product",
      arguments: { category: "dress_shoe", confidence: "0.88" }
    }],
    usage: {}
  }, allowed),
  { category: "dress_shoe", confidence: 88 }
);

// Tool-call arguments may themselves be JSON encoded as a string.
assert.deepEqual(
  parseCategoryResult({
    response: null,
    tool_calls: [{
      function: {
        name: "classify_product",
        arguments: "{\"category\":\"watch_band\",\"confidence\":\"92%\"}"
      }
    }],
    usage: {}
  }, allowed),
  { category: "watch_strap", confidence: 92 }
);

// OpenAI-compatible wrapper may put JSON inside content parts.
assert.deepEqual(
  parseCategoryResult({
    response: { content: [{ type: "text", text: "{\"category\":\"belt\",\"confidence\":97}" }] },
    tool_calls: [],
    usage: {}
  }, allowed),
  { category: "belt", confidence: 97 }
);

// Nested response values and Vietnamese category labels are handled.
assert.deepEqual(
  parseCategoryResult({
    response: {
      result: {
        product_category: { label: "giày thể thao" },
        confidence_score: { value: 0.91 }
      }
    }
  }, allowed),
  { category: "sneaker", confidence: 91 }
);

// Plain JSON strings, aliases, percentage and decimal scores remain supported.
assert.deepEqual(
  parseCategoryResult({ response: "{\"category\":\"loafers\",\"score\":0.9}" }, allowed),
  { category: "loafer", confidence: 90 }
);
assert.deepEqual(
  parseCategoryResult({ response: "Category: wallet; confidence: 86%" }, allowed),
  { category: "wallet", confidence: 86 }
);

// A generic shoe label must never be guessed into one shoe subtype.
assert.deepEqual(
  parseCategoryResult({ response: { category: "shoe", confidence: 100 }, tool_calls: [], usage: {} }, allowed),
  { category: "unknown", confidence: 100 }
);
assert.deepEqual(
  parseCategoryResult({ response: { category: "footwear", confidence: 99 } }, allowed),
  { category: "unknown", confidence: 99 }
);

// Never fabricate a confidence or accept an unrecognized category.
assert.equal(parseCategoryResult({ response: { category: "sneaker" } }, allowed), null);
assert.equal(parseCategoryResult({ response: { category: "car", confidence: 99 } }, allowed), null);
assert.equal(parseCategoryResult({ response: "I think this is a sneaker." }, allowed), null);

const source = await readFile(new URL("../functions/api/admin/image-groups.js", import.meta.url), "utf8");
const classificationSource = source.slice(source.indexOf('if(action==="classify-categories")'), source.indexOf('if(action==="compare")'));
assert.match(classificationSource, /role:"system"/,
  "vision classification must include the system message shape that passed the real Preview inference test");
assert.match(classificationSource, /role:"user",content:prompt/,
  "vision classification must send the actual category prompt as a user message");
assert.match(classificationSource, /image:supplied\[i\]\.dataUrl/,
  "the converted JPEG data URL must reach the dedicated vision image field");
assert.match(classificationSource, /parseCategoryResult\(result,allowed\)/,
  "free-form model output must be strictly validated before a classification is accepted");
assert.doesNotMatch(classificationSource, /response_format:\s*\{/,
  "avoid the schema-constrained request shape that failed the real Preview vision smoke test");

console.log("PASS: parser handles nested Workers AI payloads and aliases; live-tested system/user vision request is strictly parsed.");
