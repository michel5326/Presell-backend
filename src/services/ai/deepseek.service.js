const fetch = require("node-fetch");

const API_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";

/**
 * Contrato:
 * - recebe systemPrompt + userPrompt
 * - retorna SEMPRE um objeto JSON
 * - se falhar, lança erro
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

  // Extrai o primeiro JSON válido da resposta
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("DeepSeek response is not valid JSON");
  }

  return JSON.parse(match[0]);
}

module.exports = {
  callDeepSeekJSON,
};
