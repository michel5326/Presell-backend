const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

async function generate({ productUrl, affiliateUrl, attempt, theme }) {
  // contrato explícito e determinístico
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';

  // 1) gera copy (review)
  const copy = await aiService.generateCopy({
    type: 'review',
    productUrl,
  });

  // 2) resolve imagem do produto
  const image = await resolveProductImage(productUrl, attempt);

  const now = new Date();

  // 3) VIEW — mapeamento EXPLÍCITO (sem ...copy)
  const view = {
    // HERO
    HEADLINE: copy?.HEADLINE || '',
    SUBHEADLINE: copy?.SUBHEADLINE || '',
    INTRO: copy?.INTRO || '',

    // SEÇÕES DO TEMPLATE ATLAS
    WHY_IT_WORKS: copy?.BODY || '',
    SOCIAL_PROOF: copy?.BODY || '',
    GUARANTEE: '',

    CTA_TEXT: copy?.CTA_TEXT || '',

    // GLOBAIS
    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),

    PAGE_TITLE: copy?.HEADLINE || 'Review',
    META_DESCRIPTION: copy?.SUBHEADLINE || '',
    LANG: 'en',
  };

  // 4) template por theme
  const templatePath =
    resolvedTheme === 'light'
      ? 'review/review-light.html'
      : 'review/review-dark.html';

  // 5) render final
  const html = renderTemplate(templatePath, view);

  return {
    copy,
    image,
    html,
    theme: resolvedTheme,
    templatePath,
  };
}

module.exports = {
  generate,
};
