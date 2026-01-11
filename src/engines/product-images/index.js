const { extractOgImage } = require('./extractors/og-image');
const { extractImagesFromHtml } = require('./extractors/img-only');
const { extractHeroScreenshotDataUrl } = require('./extractors/hero-screenshot');

function isDataImage(src) {
  return typeof src === 'string' && src.startsWith('data:image/');
}

/**
 * Product Image Engine (ATLAS)
 *
 * Ordem:
 * 1) Screenshot do hero (APENAS se NÃO for base64)
 * 2) Imagens do HTML
 * 3) OG image
 *
 * ❌ Nunca retorna base64
 */
async function resolveProductImage(productUrl, attempt = 0) {
  if (!productUrl) return '';

  try {
    // 1) Screenshot (bloqueando base64)
    const heroShot = await extractHeroScreenshotDataUrl(productUrl, attempt);
    if (heroShot && !isDataImage(heroShot)) {
      return heroShot;
    }

    // 2) HTML images
    const images = await extractImagesFromHtml(productUrl);

    if (!images.length) {
      const ogImage = await extractOgImage(productUrl);
      if (ogImage) images.push(ogImage);
    }

    if (!images.length) return '';

    const index = Math.abs(Number(attempt) || 0) % images.length;
    return images[index] || '';
  } catch {
    return '';
  }
}

module.exports = {
  resolveProductImage,
};
