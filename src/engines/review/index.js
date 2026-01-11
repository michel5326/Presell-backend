const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

function normalizeCopyKeys(copy = {}) {
  const out = {};
  for (const k of Object.keys(copy)) {
    out[k.toUpperCase()] = copy[k];
  }
  return out;
}

function safe(val) {
  if (!val) return null;
  if (typeof val === 'string' && !val.trim()) return null;
  return val;
}

async function generate({ productUrl, affiliateUrl, attempt, theme }) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';

  /* 1) IA — REVIEW */
  const rawCopy = await aiService.generateCopy({
    type: 'review',
    productUrl,
  });

  const copy = normalizeCopyKeys(rawCopy);

  /* 2) IMAGEM */
  const image = await resolveProductImage(productUrl, attempt);
  const now = new Date();

  /* 3) VIEW — CONTRATO EXATO DO PROMPT REVIEW */
  const view = {
    // SEO
    PAGE_TITLE: safe(copy.HEADLINE) || 'Product Review',
    META_DESCRIPTION: safe(copy.SUBHEADLINE),
    LANG: 'en',

    // HERO
    HEADLINE: safe(copy.HEADLINE),
    SUBHEADLINE: safe(copy.SUBHEADLINE),
    INTRO: safe(copy.INTRO),

    // CONTENT
    WHY_IT_WORKS: safe(copy.WHY_IT_WORKS),
    FORMULA_TEXT: safe(copy.FORMULA_TEXT),
    BENEFITS_LIST: safe(copy.BENEFITS_LIST),
    SOCIAL_PROOF: safe(copy.SOCIAL_PROOF),
    GUARANTEE: safe(copy.GUARANTEE),

    // CTA
    CTA_TEXT: safe(copy.CTA_TEXT) || 'Visit Official Site',

    // GLOBAL
    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),
  };

  /* 4) TEMPLATE */
  const templatePath =
    resolvedTheme === 'light'
      ? 'review/review-light.html'
      : 'review/review-dark.html';

  const html = renderTemplate(templatePath, view);

  return {
    copy,
    image,
    html,
    theme: resolvedTheme,
    templatePath,
  };
}

module.exports = { generate };
