// Ordered list of free OpenRouter chat models the OCR/classify routes fall back through when the
// primary model (OPENROUTER_MODEL) is rate-limited, overloaded, or returns a genuinely unusable
// response. Free-tier models on OpenRouter each sit behind their own shared rate-limit pool, so
// "this one model is blocked right now" is a normal, expected failure mode in practice (observed
// directly: a 429 "temporarily rate-limited upstream" from the default model), not an edge case
// worth ignoring. Pulled from the live https://openrouter.ai/models?max_price=0 catalog — always
// re-check that page before relying on any of these still being free/available; the free list
// changes frequently. Vision-capable models are intentionally excluded here (see
// OPENROUTER_VISION_MODEL) since this chain is only used for text prompts.
const DEFAULT_FALLBACK_MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "inclusionai/ling-3.0-tiny:free",
];

/**
 * The primary model (OPENROUTER_MODEL, or its hardcoded default) first, followed by the fallback
 * chain (OPENROUTER_FALLBACK_MODELS if set — comma-separated — else DEFAULT_FALLBACK_MODELS),
 * de-duplicated in case the primary is also listed among the fallbacks.
 */
export function getModelChain(): string[] {
  const primary = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";
  const fallbacks = (process.env.OPENROUTER_FALLBACK_MODELS || DEFAULT_FALLBACK_MODELS.join(","))
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return Array.from(new Set([primary, ...fallbacks]));
}
