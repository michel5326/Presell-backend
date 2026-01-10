const { extractOgImage } = require('./extractors/og-image');
const { extractImagesFromHtml } = require('./extractors/img-only');
const { extractHeroProductImageWithPlaywright } = require('./extractors/playwright-hero');
const { extractDomainSlug } = require('./utils/url-slug');

function unique(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function scoreUrl(url, slug) {
  const u = (url || '').toLowerCase();
  let score = 0;

  // sinal forte: slug do domínio / produto aparecendo na url
  if (slug && u.includes(slug)) score += 80;

  // sinal de “produto”
  if (/(product|bottle|jar|capsule|supplement|pack|bundle|container)/i.test(u)) score += 60;

  // penaliza “fora do contexto”
  if (/(logo|bonus|guarantee|badge|seal|rating|stars|review|icon|favicon)/i.test(u)) score -= 120;

  // peso por extensão comum
  if (/\.(png|jpe?g|webp|avif)(\?|#|$)/i.test(u)) score += 10;

  return score;
}

/**
 * Product Image Engine (v2)
 *
 * - HTML first (rápido)
 * - rank + top N (evita randomização lenta)
 * - fallback OG
 * - fallback Playwright DOM hero (evita “printar vídeo”)
 * - Não lança erro
 * - Sempre retorna string
 */
async function resolveProductImage(productUrl, attempt = 0) {
  if (!productUrl) return '';

  try {
    const slug = extractDomainSlug(productUrl);

    // 1) HTML images (rápido)
    let images = await extractImagesFromHtml(productUrl);
    images = unique(images);

    if (images.length) {
      const ranked = images
        .map((u) => ({ u, s: scoreUrl(u, slug) }))
        .sort((a, b) => b.s - a.s)
        .map((x) => x.u);

      // corta para não ficar lento e nem trazer lixo
      const top = ranked.slice(0, 10);

      if (top.length) {
        const index = Math.abs(attempt) % top.length;
        return top[index] || top[0] || '';
      }
    }

    // 2) OG fallback
    const ogImage = await extractOgImage(productUrl);
    if (ogImage) return ogImage;

    // 3) Playwright hero (DOM) — último recurso
    const pw = await extractHeroProductImageWithPlaywright(productUrl);
    if (pw) return pw;

    return '';
  } catch {
    return '';
  }
}

module.exports = {
  resolveProductImage,
};
