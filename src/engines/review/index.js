const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

function normalizeTheme(theme) {
  const t = String(theme || '').toLowerCase().trim();
  // aceita variações: "light", "ligth", "claro", "white", "l"
  if (t === 'light' || t === 'ligth' || t === 'claro' || t === 'white' || t.startsWith('l')) {
    return 'light';
  }
  return 'dark';
}

async function generate({ productUrl, affiliateUrl, attempt, theme }) {
  const resolvedTheme = normalizeTheme(theme);

  // 1) IA — intenção REVIEW
  const copy = await aiService.generateCopy({
    type: 'review',
    productUrl,
  });

  // 2) Imagem — determinística por attempt
  const image = await resolveProductImage(productUrl, attempt);

  // 3) Monta payload pro template (mantém compat com seu HTML atual)
  const now = new Date();
  const view = {
    ...copy,

    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),

    PAGE_TITLE: copy?.PAGE_TITLE || copy?.HEADLINE || 'Review',
    META_DESCRIPTION: copy?.META_DESCRIPTION || copy?.SUBHEADLINE || '',
    LANG: copy?.LANG || 'en',
  };

  // 4) ✅ Seleciona template pelo theme
  const templatePath =
    resolvedTheme === 'light'
      ? 'review/review-light.html'
      : 'review/review-dark.html';

  const html = renderTemplate(templatePath, view);

  return {
    copy,
    image,
    html,
    theme: resolvedTheme, // útil pra debugar no preview
    templatePath,         // útil pra debugar no preview
  };
}

module.exports = {
  generate,
};
