const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Extractor: img-only
 *
 * - Faz fetch da página do produtor
 * - Extrai APENAS <img src>
 * - NÃO filtra
 * - NÃO deduz imagem correta
 * - Retorna lista determinística (ordem do HTML)
 */
async function extractImagesFromHtml(productUrl) {
  if (!productUrl) return [];

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
    const src = $(el).attr('src');
    if (src) {
      images.push(src.trim());
    }
  });

  return images;
}

module.exports = {
  extractImagesFromHtml,
};
