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

async function generate({ productUrl, affiliateUrl, attempt, theme }) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';

  // 1) GERA COPY DA IA
  const rawCopy = await aiService.generateCopy({
    type: 'review',
    productUrl,
  });

  const copy = normalizeCopyKeys(rawCopy);

  // 2) IMAGEM
  const image = await resolveProductImage(productUrl, attempt);
  const now = new Date();

  // 3) VIEW — CONTRATO 100% ALINHADO COM PROMPT + TEMPLATE
  const view = {
    // HERO
    HEADLINE: copy.HEADLINE || '',
    SUBHEADLINE: copy.SUBHEADLINE || '',
    INTRO: copy.INTRO || '',

    // SEÇÕES
    WHY_IT_WORKS: copy.WHY_IT_WORKS || '',
    FORMULA_TEXT: copy.FORMULA_TEXT || '',
    BENEFITS_LIST: copy.BENEFITS_LIST || '',
    SOCIAL_PROOF: copy.SOCIAL_PROOF || '',
    GUARANTEE: copy.GUARANTEE || '',

    // OPCIONAIS (não quebram template)
    TESTIMONIAL_IMAGES: '',
    GUARANTEE_IMAGE: '',

    // GLOBAIS
    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),
    PAGE_TITLE: copy.HEADLINE || 'Review',
    META_DESCRIPTION: copy.SUBHEADLINE || '',
    LANG: 'en',
  };

  // 4) TEMPLATE
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
