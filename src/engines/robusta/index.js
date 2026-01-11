const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

async function generate({ productUrl, affiliateUrl, attempt, theme }) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';

  const copy = await aiService.generateCopy({
    type: 'robusta',
    productUrl,
  });

  const image = await resolveProductImage(productUrl, attempt);

  const now = new Date();
  const view = {
    ...copy,
    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),
    PAGE_TITLE: copy?.PAGE_TITLE || copy?.HEADLINE || 'Robusta',
    META_DESCRIPTION: copy?.META_DESCRIPTION || copy?.SUBHEADLINE || '',
    LANG: copy?.LANG || 'en',
  };

  const templatePath =
    resolvedTheme === 'light'
      ? 'robusta/robusta-light.html'
      : 'robusta/robusta-dark.html';

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
