const fetch = require("node-fetch");

const API_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";

/**
 * Contrato:
 * - recebe systemPrompt + userPrompt
 * - retorna SEMPRE um objeto JSON plano
 * - sem regex
 * - determinístico
 */
async function callDeepSeekJSON({ systemPrompt, userPrompt }) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek error: ${res.status}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;

  if (!raw) {
    throw new Error("DeepSeek empty response");
  }

  // 🔒 limpeza segura (remove markdown / lixo comum)
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error("[DeepSeek RAW]", raw);
    throw new Error("DeepSeek returned invalid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("DeepSeek JSON is not a plain object");
  }

  return parsed;
}

module.exports = {
  callDeepSeekJSON,
};
