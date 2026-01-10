const axios = require('axios');
const cheerio = require('cheerio');
const { normalizeImageUrl } = require('../utils/normalize-url');
const { shouldDiscardImageUrl } = require('../utils/filter-image-url');
const { extractDomainSlug } = require('../utils/url-slug');

async function extractImagesFromHtml(productUrl) {
  if (!productUrl) return [];

  const slug = extractDomainSlug(productUrl);

  const response = await axios.get(productUrl, {
    timeout: 10000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; PresellBot/1.0; +https://example.com/bot)',
    },
  });

  const html = response.data;
  const $ = cheerio.load(html);

  const images = [];

  $('img').each((_, el) => {
    const rawSrc = $(el).attr('src');
    const src = normalizeImageUrl(rawSrc, productUrl);
    if (!src) return;

    const lower = src.toLowerCase();

    // ✅ EXCEÇÃO FORTE: slug do produto no filename
    if (slug && lower.includes(slug) && !shouldDiscardImageUrl(src)) {
  images.push(src);
  return;
}


    // filtro burro
    if (!shouldDiscardImageUrl(src)) {
      images.push(src);
    }
  });

  return images;
}

module.exports = {
  extractImagesFromHtml,
};
