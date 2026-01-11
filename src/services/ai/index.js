const { callDeepSeekJSON } = require("./deepseek.service");
const reviewPrompt = require("./prompts/review.prompt");
const robustaPrompt = require("./prompts/robusta.prompt");

const REQUIRED_KEYS = {
  review: ["HEADLINE", "SUBHEADLINE", "BODY", "CTA_TEXT"],
  robusta: ["HEADLINE", "SUBHEADLINE", "BODY", "CTA_TEXT"],
};

async function generateCopy({ type, productUrl, attempts = 3 }) {
  const systemPrompt =
    type === "review" ? reviewPrompt :
    type === "robusta" ? robustaPrompt :
    null;

  if (!systemPrompt) throw new Error("Invalid AI type");

  for (let i = 1; i <= attempts; i++) {
    try {
      const json = await callDeepSeekJSON({
        systemPrompt,
        userPrompt: `Product URL: ${productUrl}`,
      });

      const required = REQUIRED_KEYS[type] || [];
      const missing = required.filter(k => !json[k]);

      if (missing.length) {
        throw new Error(`Invalid copy structure`);
      }

      console.log(`[AI] success on attempt ${i}`);
      return json;

    } catch (err) {
      console.error(`[AI] attempt ${i}/${attempts} failed:`, err.message);
      if (i === attempts) {
        throw new Error(`AI failed after ${attempts} attempts: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 1000 * i));
    }
  }
}

module.exports = { generateCopy };
