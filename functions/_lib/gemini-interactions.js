// Bounded fallback only for transient HTTP 503 model-capacity errors. Never retry timeout, network, 429, or auth failures.
function logGeminiDiagnostic(event, fields) {
  // Deliberately log metadata only: Never log prompts, image bytes, API keys, or raw Google error messages.
  console.warn("[SinDarealest Gemini]", JSON.stringify({ event, ...fields }));
}

function requestFailure(error, { model, timeoutMs, attempt }) {
  const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
  const wrapped = new Error(timedOut
    ? `Gemini request timeout after ${timeoutMs}ms`
    : "Gemini network request failed");
  wrapped.name = timedOut ? "TimeoutError" : "GeminiNetworkError";
  wrapped.code = timedOut ? "GEMINI_TIMEOUT" : "GEMINI_NETWORK_ERROR";
  wrapped.model = model;
  wrapped.timeoutMs = timeoutMs;
  wrapped.attempt = attempt;
  logGeminiDiagnostic(timedOut ? "request_timeout" : "network_error", {
    code: wrapped.code,
    model,
    timeoutMs,
    attempt,
    upstreamErrorType: typeof error?.name === "string" ? error.name.slice(0, 60) : "Error"
  });
  return wrapped;
}

export async function requestGeminiInteraction({ apiKey, input, timeoutMs = 45000 }) {
  let model = "gemini-3.8-flash";
  for (let attempt = 0; attempt < 2; attempt++) {
    let response;
    try {
      response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey, "Api-Revision": "2026-05-20" },
        body: JSON.stringify({ model, input }),
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (error) {
      // A timeout or connection failure must not trigger another billable API request.
      throw requestFailure(error, { model, timeoutMs, attempt: attempt + 1 });
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiError = data?.error || {};
      logGeminiDiagnostic("api_response_error", {
        code: response.status === 429 || apiError.status === "RESOURCE_EXHAUSTED"
          ? "GEMINI_QUOTA_OR_RATE_LIMIT"
          : response.status === 503 || apiError.status === "UNAVAILABLE"
            ? "GEMINI_UNAVAILABLE"
            : "GEMINI_API_ERROR",
        httpStatus: response.status,
        apiStatus: typeof apiError.status === "string" ? apiError.status.slice(0, 80) : "",
        apiCode: Number.isFinite(apiError.code) ? apiError.code : null,
        model,
        attempt: attempt + 1,
        fallbackWillRun: response.status === 503 && attempt === 0
      });
    }
    if (response.status !== 503 || attempt === 1) return { response, data, model };
    // Google recommends backoff for transient 503 UNAVAILABLE responses.
    await new Promise(resolve => setTimeout(resolve, 1200));
    model = "gemini-3.6-flash";
  }
  throw new Error("Gemini request failed unexpectedly.");
}
