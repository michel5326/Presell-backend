const { callDeepSeekJSON } = require("./deepseek.service");

const reviewPrompt = require("./prompts/review.prompt");
const robustaPrompt = require("./prompts/robusta.prompt");
const editorialPrompt = require("./prompts/editorial.prompt");
const editorialScientificPrompt = require("./prompts/editorial-scientific.prompt");

/**
 * Gera copy via IA de forma determinística
 */
async function generateCopy({ type, productUrl, problem, adPhrase, lang }) {
  if (!type) {
    throw new Error("AI type is required");
  }

  let systemPrompt;
  let userPrompt;

  /* =========================
     REVIEW
  ========================= */
  if (type === "review") {
    if (!productUrl) throw new Error("productUrl is required");
    if (!/^https?:\/\//i.test(productUrl)) {
      throw new Error("Invalid productUrl (must be absolute URL)");
    }

    // ✅ AQUI ESTÁ A CORREÇÃO
    systemPrompt = reviewPrompt(lang || "en");
    userPrompt = `Product URL: ${productUrl}`;

  /* =========================
     ROBUSTA
  ========================= */
  } else if (type === "robusta") {
    if (!productUrl) throw new Error("productUrl is required");
    if (!/^https?:\/\//i.test(productUrl)) {
      throw new Error("Invalid productUrl (must be absolute URL)");
    }

    systemPrompt = robustaPrompt;
    userPrompt = `Product URL: ${productUrl}`;

  /* =========================
     EDITORIAL (TOF)
  ========================= */
  } else if (type === "editorial") {
    if (!problem) throw new Error("problem is required for editorial");

    systemPrompt = editorialPrompt;

    userPrompt = `
Problem:
${problem}

${adPhrase ? `Primary ad phrase:\n${adPhrase}` : ""}
    `.trim();

  /* =========================
     EDITORIAL SCIENTIFIC
  ========================= */
  } else if (type === "editorial_scientific") {
    if (!problem) {
      throw new Error("problem is required for scientific editorial");
    }

    systemPrompt = editorialScientificPrompt;

    userPrompt = `
Problem:
${problem}

${adPhrase ? `Primary ad phrase:\n${adPhrase}` : ""}
    `.trim();

  } else {
    throw new Error(`Unknown AI type: ${type}`);
  }

  console.log("[AI] generating copy (NO RETRY MODE)", type, lang || "en");

  return callDeepSeekJSON({
    systemPrompt,
    userPrompt,
  });
}

module.exports = {
  generateCopy,
};
