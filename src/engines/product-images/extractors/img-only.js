const axios = require('axios');
const cheerio = require('cheerio');
const { normalizeImageUrl } = require('../utils/normalize-url');
const { shouldDiscardImageUrl } = require('../utils/filter-image-url');

/**
 * Extractor: og-image
 *
 * - Lê apenas <meta property="og:image">
 * - Não deduz
 * - Não escolhe
 * - Retorna 0 ou 1 URL
 */
async function extractOgImage(productUrl) {
  if (!productUrl) return null;

  const response = await axios.get(productUrl, {
    timeout: 10000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; PresellBot/1.0; +https://example.com/bot)',
    },
  });

  const html = response.data;
  const $ = cheerio.load(html);

  const raw = $('meta[property="og:image"]').attr('content');
  const normalized = normalizeImageUrl(raw, productUrl);

  if (!normalized) return null;
  if (shouldDiscardImageUrl(normalized)) return null;

  return normalized;
}

module.exports = {
  extractOgImage,
};
