const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

async function generate({ productUrl, affiliateUrl, attempt, theme }) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';

  // 1) IA — robusta
  const copy = await aiService.generateCopy({
    type: 'robusta',
    productUrl,
  });

  // 2) imagem
  const image = await resolveProductImage(productUrl, attempt);

  const now = new Date();

  // 3) VIEW — mapeamento explícito (sem spread)
  const view = {
    // HERO
    HEADLINE: copy?.HEADLINE || '',
    SUBHEADLINE: copy?.SUBHEADLINE || '',
    BODY: copy?.BODY || '',

    CTA_TEXT: copy?.CTA_TEXT || '',

    // GLOBAIS
    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),

    PAGE_TITLE: copy?.HEADLINE || 'Robusta',
    META_DESCRIPTION: copy?.SUBHEADLINE || '',
    LANG: 'en',
  };

  // 4) template por theme
  const templatePath =
    resolvedTheme === 'light'
      ? 'robusta/robusta-light.html'
      : 'robusta/robusta-dark.html';

  // 5) render
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
