const path = require('path');
const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplateFromFile } = require('../../services/templates/renderTemplate.service');

async function generate({ productUrl, affiliateUrl, attempt, theme = 'dark' }) {
  // 1) IA — intenção REVIEW
  const copy = await aiService.generateCopy({
    type: 'review',
    productUrl,
  });

  // 2) Imagem — determinística por attempt
  const image = await resolveProductImage(productUrl, attempt);

  // 3) Dados no formato que o template espera
  const templateData = {
    ...(copy || {}),
    PRODUCT_IMAGE: image,
    AFFILIATE_LINK: affiliateUrl,
    CURRENT_YEAR: String(new Date().getFullYear()),
    LANG: 'en',
  };

  // 4) Template file
  const templateFile = theme === 'light' ? 'review-light.html' : 'review-dark.html';

  const templatePath = path.join(
    process.cwd(),
    'src',
    'templates',
    'review',
    templateFile
  );

  // 5) Render HTML
  const html = renderTemplateFromFile(templatePath, templateData);

  // 6) Retorno (mantém legacy + adiciona html)
  return {
    copy,
    image,
    html,
  };
}

module.exports = {
  generate,
};
