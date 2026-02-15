const { extractOgImage } = require('./extractors/og-image');
const { extractGuaranteeImage } = require('./extractors/guarantee-image');
const { extractImagesFromHtml } = require('./extractors/img-only');
const { extractHeroScreenshotDataUrl } = require('./extractors/hero-screenshot');
const {
  getImageByDomain,
  saveImageForDomain,
} = require('../../services/productImageCache.service');

function isDataImage(src) {
  return typeof src === 'string' && src.startsWith('data:image/');
}

function extractHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isSameOrSubdomain(child, parent) {
  if (!child || !parent) return false;
  return child === parent || child.endsWith(`.${parent}`);
}

/**
 * Product Image Engine (ATLAS)
 *
 * Ordem FINAL (segura):
 * 1) productImageUrl (manual)
 *    - usa sempre
 *    - salva cache SOMENTE se domínio válido
 * 2) cache por domínio
 * 3) Screenshot do hero
 * 4) Imagens do HTML
 * 5) OG image
 * 6) Guarantee image (fallback final)
 *
 * ❌ Nunca retorna base64
 * ❌ Nunca grava cache automaticamente
 */
async function resolveProductImage(
  productUrl,
  attempt = 0,
  productImageUrl = null
) {
  if (!productUrl) return '';

  const productHost = extractHost(productUrl);

  try {
    // 1) Imagem manual (front)
    if (productImageUrl) {
      const imageHost = extractHost(productImageUrl);

      if (
        productHost &&
        imageHost &&
        isSameOrSubdomain(imageHost, productHost)
      ) {
        await saveImageForDomain(productHost, productImageUrl, 'manual');
      }

      return productImageUrl;
    }

    // 2) Cache por domínio (somente leitura)
    if (productHost) {
      const cachedImage = await getImageByDomain(productHost);
      if (cachedImage) {
        return cachedImage;
      }
    }

    // 3) Screenshot do hero (bloqueando base64)
    const heroShot = await extractHeroScreenshotDataUrl(productUrl, attempt);
    if (heroShot && !isDataImage(heroShot)) {
      return heroShot;
    }

    // 4) Imagens do HTML
    const images = await extractImagesFromHtml(productUrl);

    if (!images.length) {
      const ogImage = await extractOgImage(productUrl);
      if (ogImage) images.push(ogImage);
    }

    // 5) Se ainda não encontrou nada → tentar garantia
    if (!images.length) {
      const guaranteeImage = await extractGuaranteeImage(productUrl);
      if (guaranteeImage) {
        return guaranteeImage;
      }
      return '';
    }

    // Rotação determinística por attempt
    const index = Math.abs(Number(attempt) || 0) % images.length;
    return images[index] || '';
  } catch {
    return '';
  }
}

module.exports = {
  resolveProductImage,
};
