const { extractImagesFromHtml } = require('./extractors/img-only');

/**
 * Product Image Engine (v1)
 *
 * - Usa extractor img-only
 * - Lista determinística
 * - Rotação por attempt
 * - Não lança erro
 * - Sempre retorna string
 */
async function resolveProductImage(productUrl, attempt = 0) {
  if (!productUrl) return '';

  try {
    const images = await extractImagesFromHtml(productUrl);

    if (!images.length) return '';

    const index = Math.abs(attempt) % images.length;
    return images[index] || '';
  } catch {
    return '';
  }
}

module.exports = {
  resolveProductImage,
};
