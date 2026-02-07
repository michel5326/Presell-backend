const aiService = require('../../services/ai');
const searchCampaignPrompt = require('../prompts/searchCampaign.prompt');
const schema = require('../schemas/searchCampaign.schema.json');
const Ajv = require('ajv');
const axios = require('axios');
const cheerio = require('cheerio');

const ajv = new Ajv({ allErrors: true });

// =======================
// CACHE EM MEMÓRIA
// =======================
const productCache = new Map();

// =======================
// HELPERS
// =======================
function normalizeBaseUrl(url) {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}

function clampText(text, max) {
  if (!text || typeof text !== 'string') return text;
  if (text.length <= max) return text;
  const sliced = text.slice(0, max);
  return sliced.replace(/\s+\S*$/, '').trim();
}

function normalizeStructuredSnippet(snippet) {
  if (!snippet) return null;

  if (typeof snippet === 'string') {
    return snippet.trim();
  }

  if (typeof snippet === 'object') {
    const header = snippet.header || snippet.title;
    const values = Array.isArray(snippet.values)
      ? snippet.values.join(', ')
      : snippet.items?.join(', ');

    if (header && values) {
      return `${header}: ${values}`;
    }
  }

  return null;
}

// =======================
// SCRAPING (BACKGROUND)
// =======================
async function scrapeProductPage(productUrl) {
  try {
    const { data } = await axios.get(productUrl, {
      timeout: 8000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);

    return {
      title: $('title').first().text().trim(),
      metaDescription: $('meta[name="description"]').attr('content') || '',
      h1: $('h1').first().text().trim(),
      h2: $('h2')
        .slice(0, 3)
        .map((_, el) => $(el).text().trim())
        .get(),
      bodyText: $('body')
        .clone()
        .find('script, style, noscript, iframe')
        .remove()
        .end()
        .text()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2000)
    };
  } catch {
    return null;
  }
}

// =======================
// CONTEXTO NÃO BLOQUEANTE
// =======================
async function getProductContext(productUrl) {
  if (productCache.has(productUrl)) {
    return productCache.get(productUrl);
  }

  scrapeProductPage(productUrl)
    .then(data => {
      if (data) productCache.set(productUrl, data);
    })
    .catch(() => {});

  return null; // fallback imediato
}

// =======================
// ENGINE PRINCIPAL
// =======================
async function generateSearchCampaign({
  keyword,
  language,
  baseUrl,
  productUrl
}) {
  if (!keyword) throw new Error('Keyword is required');
  if (!productUrl) throw new Error('productUrl is required');

  const normalizedUrl = normalizeBaseUrl(baseUrl);

  // 🚀 NÃO BLOQUEIA REQUEST
  const productContext = await getProductContext(productUrl);

  const prompt = searchCampaignPrompt({
    keyword,
    language,
    baseUrl: normalizedUrl,
    productContext
  });

  const aiResponse = await aiService.generateCopy({
    type: 'google_ads_search',
    adPhrase: prompt,
    lang: language
  });

  let parsed;
  try {
    parsed = typeof aiResponse === 'string'
      ? JSON.parse(aiResponse)
      : aiResponse;
  } catch {
    throw new Error('AI response is not valid JSON');
  }

  // HARD CAPS
  parsed.headlines = parsed.headlines?.map(h => clampText(h, 30));
  parsed.descriptions = parsed.descriptions?.map(d => clampText(d, 90));
  parsed.callouts = parsed.callouts?.map(c => clampText(c, 25));

  if (Array.isArray(parsed.sitelinks) && normalizedUrl) {
    parsed.sitelinks = parsed.sitelinks.map((sl, i) => ({
      title: clampText(sl.title, 25),
      url: `${normalizedUrl}?sl=${i + 1}`
    }));
  }

  if (Array.isArray(parsed.structured_snippets)) {
    parsed.structured_snippets = parsed.structured_snippets
      .map(normalizeStructuredSnippet)
      .filter(Boolean);
  }

  const validate = ajv.compile(schema);
  if (!validate(parsed)) {
    const errors = validate.errors
      .map(e => `${e.instancePath} ${e.message}`)
      .join(' | ');
    throw new Error(`Schema validation failed: ${errors}`);
  }

  return parsed;
}

module.exports = {
  generateSearchCampaign
};
