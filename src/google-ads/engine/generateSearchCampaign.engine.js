const aiService = require('../../services/ai');
const searchCampaignPrompt = require('../prompts/searchCampaign.prompt');
const schema = require('../schemas/searchCampaign.schema.json');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true });

function normalizeBaseUrl(url) {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

function clampText(text, max) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '').trim();
}

function normalizeStructuredSnippet(snippet) {
  if (typeof snippet === 'string') return snippet.trim();
  if (snippet && typeof snippet === 'object') {
    const header = snippet.header || snippet.title;
    const values = Array.isArray(snippet.values)
      ? snippet.values.join(', ')
      : snippet.items?.join(', ');
    if (header && values) return `${header}: ${values}`;
  }
  return null;
}

// 🔒 garante tamanho mínimo SEM inventar copy
function padArray(arr, min, filler = null) {
  const out = Array.isArray(arr) ? [...arr] : [];
  while (out.length < min) out.push(filler);
  return out;
}

async function generateSearchCampaign({
  keyword,
  language,
  baseUrl,
  intentMode = 'hybrid' // novo parâmetro com fallback seguro
}) {
  if (!keyword) throw new Error('Keyword is required');

  const normalizedUrl = normalizeBaseUrl(baseUrl);

  const prompt = searchCampaignPrompt({
    keyword,
    language,
    baseUrl: normalizedUrl,
    intentMode
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

  /* ========= HEADLINES ========= */
  parsed.headlines = padArray(parsed.headlines, 15, '')
    .slice(0, 15)
    .map(h => clampText(h, 30));

  /* ========= DESCRIPTIONS ========= */
  parsed.descriptions = padArray(parsed.descriptions, 4, '')
    .slice(0, 4)
    .map(d => clampText(d, 90));

  /* ========= CALLOUTS ========= */
  parsed.callouts = padArray(parsed.callouts, 4, '')
    .slice(0, 4)
    .map(c => clampText(c, 25));

  /* ========= SITELINKS (COM DESCRIÇÃO) ========= */
  if (normalizedUrl) {
    const fallbackTitles = [
      'How It Works',
      'Ingredients Overview',
      'Real User Reviews',
      'Official Website'
    ];

    const fallbackDesc1 = [
      'Learn the basic process',
      'See what the formula uses',
      'Read user experiences',
      'Visit the official page'
    ];

    const fallbackDesc2 = [
      'Simple overview explained',
      'Key elements explained',
      'Feedback from real users',
      'More product information'
    ];

    parsed.sitelinks = padArray(parsed.sitelinks, 4, {})
      .slice(0, 4)
      .map((sl, i) => ({
        title: clampText(sl?.title || fallbackTitles[i], 25),
        description_1: clampText(sl?.description_1 || fallbackDesc1[i], 35),
        description_2: clampText(sl?.description_2 || fallbackDesc2[i], 35),
        url: `${normalizedUrl}?sl=${i + 1}`
      }));
  } else {
    parsed.sitelinks = [];
  }

  /* ========= STRUCTURED SNIPPETS ========= */
  parsed.structured_snippets = Array.isArray(parsed.structured_snippets)
    ? parsed.structured_snippets
        .map(normalizeStructuredSnippet)
        .filter(Boolean)
    : [];

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