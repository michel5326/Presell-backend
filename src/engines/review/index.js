const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

async function generate({ productUrl, affiliateUrl, attempt, theme }) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';

  const copy = await aiService.generateCopy({
    type: 'review',
    productUrl,
  });

  const image = await resolveProductImage(productUrl, attempt);
  const now = new Date();

  const view = {
    // HERO
    HEADLINE: copy?.HEADLINE || '',
    SUBHEADLINE: copy?.SUBHEADLINE || '',
    INTRO: copy?.INTRO || '',

    // ATLAS SECTIONS (🔥 ESSENCIAL)
    WHY_IT_WORKS: copy?.BODY || '',
    FORMULA_TEXT: copy?.BODY || '',
    BENEFITS_LIST: copy?.BODY || '',
    SOCIAL_PROOF: copy?.BODY || '',
    GUARANTEE: copy?.CTA_TEXT || '',

    // OPCIONAIS (não quebra)
    TESTIMONIAL_IMAGES: '',
    GUARANTEE_IMAGE: '',

    // GLOBAIS
    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),
    PAGE_TITLE: copy?.HEADLINE || 'Review',
    META_DESCRIPTION: copy?.SUBHEADLINE || '',
    LANG: 'en',
  };

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
