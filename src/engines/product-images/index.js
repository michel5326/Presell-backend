const { extractOgImage } = require('./extractors/og-image');
const { extractImagesFromHtml } = require('./extractors/img-only');
const { extractHeroScreenshotDataUrl } = require('./extractors/hero-screenshot');

/**
 * Product Image Engine (v2)
 *
 * Ordem:
 * 1) Playwright screenshot recortado do elemento do produto (mais assertivo)
 *    - Agora rotaciona por attempt também
 * 2) HTML imgs (rápido, mas falha em muitos sites)
 * 3) OG image (último fallback)
 *
 * - Não lança erro
 * - Sempre retorna string
 */
async function resolveProductImage(productUrl, attempt = 0) {
  if (!productUrl) return '';

  const safeAttempt = Number.isFinite(Number(attempt)) ? Number(attempt) : 0;

  try {
    // 1) ✅ mais assertivo (AGORA COM attempt)
    const heroShot = await extractHeroScreenshotDataUrl(productUrl, safeAttempt);
    if (heroShot) return heroShot;

    // 2) fallback: lista de imagens do HTML
    const images = await extractImagesFromHtml(productUrl);

    if (!images.length) {
      const ogImage = await extractOgImage(productUrl);
      if (ogImage) images.push(ogImage);
    }

    if (!images.length) return '';

    const index = Math.abs(safeAttempt) % images.length;
    return images[index] || '';
  } catch {
    return '';
  }
}

module.exports = {
  resolveProductImage,
};
