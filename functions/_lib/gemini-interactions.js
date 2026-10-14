// One bounded fallback for transient model-capacity errors. Never retry 429/quota errors.
export async function requestGeminiInteraction({ apiKey, input, timeoutMs = 45000 }) {
  let model = "gemini-3.8-flash";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey, "Api-Revision": "2026-05-20" },
      body: JSON.stringify({ model, input }),
      signal: AbortSignal.timeout(timeoutMs)
    });
    const data = await response.json().catch(() => ({}));
    if (response.status !== 503 || attempt === 1) return { response, data, model };
    // Google recommends backoff for transient 503 UNAVAILABLE responses.
    await new Promise(resolve => setTimeout(resolve, 1200));
    model = "gemini-3.6-flash";
  }
  throw new Error("Gemini request failed unexpectedly.");
}
