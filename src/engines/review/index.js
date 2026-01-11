const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

function pickThemeTemplate(theme) {
  const t = String(theme || '').toLowerCase().trim();

  // aceita: "light" | "dark" | "review-light" | "review-dark" | etc.
  if (t.includes('light')) return 'review/review-light.html';
  if (t.includes('dark')) return 'review/review-dark.html';

  // default
  return 'review/review-dark.html';
}

async function generate({ productUrl, affiliateUrl, attempt = 0, theme }) {
  // 1) IA — intenção REVIEW
  const copy = await aiService.generateCopy({
    type: 'review',
    productUrl,
  });

  // 2) Imagem — determinística por attempt
  const image = await resolveProductImage(productUrl, attempt);

  // 3) Monta payload pro template (compatível com seu HTML)
  const now = new Date();
  const view = {
    ...copy,

    // chaves que seu template usa:
    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),

    // fallbacks pra não quebrar
    PAGE_TITLE: copy?.PAGE_TITLE || copy?.HEADLINE || 'Review',
    META_DESCRIPTION: copy?.META_DESCRIPTION || copy?.SUBHEADLINE || '',
    LANG: copy?.LANG || 'en',
  };

  // 4) Renderiza HTML no backend (dark default, ou light se o front mandar)
  const templatePath = pickThemeTemplate(theme);
  const html = renderTemplate(templatePath, view);

  // 5) Retorna sem quebrar o front
  return {
    copy,
    image,
    html,
    theme: templatePath.includes('light') ? 'light' : 'dark',
  };
}

module.exports = {
  generate,
};
