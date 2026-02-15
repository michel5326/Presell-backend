const fetch = require('node-fetch');

function normalizeUrl(src, base) {
  try {
    if (!src) return '';
    if (/^https?:\/\//i.test(src)) return src;
    return new URL(src, base).href;
  } catch {
    return '';
  }
}

async function extractGuaranteeImage(productUrl) {
  if (!productUrl) return '';

  try {
    const res = await fetch(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!res.ok) return '';

    const html = await res.text();
    const base = new URL(productUrl);

    const KEYWORDS = [
      'guarantee',
      'moneyback',
      'refund',
      'badge',
      'seal',
      'warranty',
      '30day',
      '60day',
      '90day'
    ];

    const matches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];

    for (const m of matches) {
      const rawSrc = m[1];
      const src = normalizeUrl(rawSrc, base);

      if (!src) continue;

      const low = src.toLowerCase();

      if (low.startsWith('data:')) continue;
      if (low.endsWith('.svg')) continue;

      const hasKeyword = KEYWORDS.some(k => low.includes(k));

      if (hasKeyword) {
        return src;
      }
    }

    return '';
  } catch {
    return '';
  }
}

module.exports = {
  extractGuaranteeImage,
};
