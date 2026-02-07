const aiService = require('../../services/ai');
const searchCampaignPrompt = require('../prompts/searchCampaign.prompt');
const schema = require('../schemas/searchCampaign.schema.json');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true });

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

async function generateSearchCampaign({
  keyword,
  language,
  baseUrl
}) {
  if (!keyword) {
    throw new Error('Keyword is required');
  }

  const normalizedUrl = normalizeBaseUrl(baseUrl);

  const prompt = searchCampaignPrompt({
    keyword,
    language,
    baseUrl: normalizedUrl
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

  if (Array.isArray(parsed.headlines)) {
    parsed.headlines = parsed.headlines.map(h => clampText(h, 30));
  }

  if (Array.isArray(parsed.descriptions)) {
    parsed.descriptions = parsed.descriptions.map(d => clampText(d, 90));
  }

  if (Array.isArray(parsed.callouts)) {
    parsed.callouts = parsed.callouts.map(c => clampText(c, 25));
  }

  if (Array.isArray(parsed.sitelinks) && normalizedUrl) {
    parsed.sitelinks = parsed.sitelinks.map((sl, index) => ({
      title: clampText(sl.title, 25),
      url: `${normalizedUrl}?sl=${index + 1}`
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
