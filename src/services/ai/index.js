const { callDeepSeekJSON } = require("./deepseek.service");

const reviewPrompt = require("./prompts/review.prompt");
const robustaPrompt = require("./prompts/robusta.prompt");

/**
 * AI Facade
 *
 * type: "review" | "robusta"
 * productUrl: string
 */
async function generateCopy({ type, productUrl }) {
  if (!type) {
    throw new Error("AI type is required");
  }

  if (!productUrl) {
    throw new Error("productUrl is required");
  }

  let systemPrompt;

  if (type === "review") {
    systemPrompt = reviewPrompt;
  } else if (type === "robusta") {
    systemPrompt = robustaPrompt;
  } else {
    throw new Error(`Unknown AI type: ${type}`);
  }

  const userPrompt = `Product URL: ${productUrl}`;

  return callDeepSeekJSON({
    systemPrompt,
    userPrompt,
  });
}

module.exports = {
  generateCopy,
};
