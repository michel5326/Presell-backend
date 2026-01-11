const { callDeepSeekJSON } = require("./deepseek.service");

const reviewPrompt = require("./prompts/review.prompt");
const robustaPrompt = require("./prompts/robusta.prompt");

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

  // 🔥 GARANTIA DE URL ABSOLUTA (CRÍTICO)
  if (!/^https?:\/\//i.test(productUrl)) {
    throw new Error("Invalid productUrl (must be absolute URL)");
  }

  const userPrompt = `Product URL: ${productUrl}`;

  console.log("[AI] generating copy (NO RETRY MODE)");

  // ❌ REMOVE fallback
  // ❌ REMOVE BODY genérico
  // ✅ deixa falhar se a IA falhar
  return callDeepSeekJSON({
    systemPrompt,
    userPrompt,
  });
}

module.exports = {
  generateCopy,
};
