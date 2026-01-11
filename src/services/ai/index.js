const fetch = require('node-fetch');

/**
 * 🔥 IA SEM RETRY / SEM BLOQUEIO
 * - Nunca quebra o fluxo
 * - Nunca lança erro
 * - Sempre retorna algo
 */
async function generateCopy({ type, productUrl }) {
  try {
    console.log('[AI] generating copy (NO RETRY MODE)');

    const response = await fetch(process.env.AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        type,
        productUrl,
      }),
    });

    const text = await response.text();

    // 🔥 TENTAR JSON
    try {
      const parsed = JSON.parse(text);
      console.log('[AI] JSON parsed successfully');
      return parsed;
    } catch {
      console.warn('[AI] JSON invalid, wrapping raw text');

      // 🔥 FALLBACK ABSOLUTO (ESTILO FRANK)
      return {
        HEADLINE: 'Product Review',
        SUBHEADLINE: 'Important information you should know',
        INTRO: text.slice(0, 500),
        BODY: text,
        CTA_TEXT: 'Visit the official website',
      };
    }
  } catch (err) {
    console.error('[AI] fatal error, returning fallback copy', err.message);

    // 🔥 NUNCA FALHA
    return {
      HEADLINE: 'Product Review',
      SUBHEADLINE: 'Independent analysis',
      INTRO: 'This product has gained attention recently.',
      BODY: 'More details are available on the official website.',
      CTA_TEXT: 'Check availability',
    };
  }
}

module.exports = {
  generateCopy,
};
