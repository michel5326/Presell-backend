const { callDeepSeekJSON } = require("./deepseek.service");

const reviewPrompt = require("./prompts/review.prompt");
const robustaPrompt = require("./prompts/robusta.prompt");

const MAX_RETRIES = 3;

/**
 * Validação mínima da copy (estilo Frank)
 */
function isValidCopy(copy) {
  if (!copy || typeof copy !== "object") return false;
  if (!copy.HEADLINE && !copy.headline) return false;
  return true;
}

/**
 * AI Facade com retry automático
 */
async function generateCopy({ type, productUrl }) {
  if (!type) throw new Error("AI type is required");
  if (!productUrl) throw new Error("productUrl is required");

  let systemPrompt;

  if (type === "review") {
    systemPrompt = reviewPrompt;
  } else if (type === "robusta") {
    systemPrompt = robustaPrompt;
  } else {
    throw new Error(`Unknown AI type: ${type}`);
  }

  const userPrompt = `Product URL: ${productUrl}`;

  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[AI] attempt ${attempt}/${MAX_RETRIES}`);

      const copy = await callDeepSeekJSON({
        systemPrompt,
        userPrompt,
      });

      if (!isValidCopy(copy)) {
        throw new Error("Invalid copy structure");
      }

      console.log("[AI] valid copy received");
      return copy;
    } catch (err) {
      lastError = err;
      console.warn(`[AI] attempt ${attempt} failed:`, err.message);
    }
  }

  throw new Error(
    `AI failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

module.exports = {
  generateCopy,
};
