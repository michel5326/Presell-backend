const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

async function generate({ productUrl, affiliateUrl, attempt }) {
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

    // nomes que seu template usa:
    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),

    // se não vierem da IA, não quebra (fica vazio)
    PAGE_TITLE: copy?.PAGE_TITLE || copy?.HEADLINE || 'Review',
    META_DESCRIPTION: copy?.META_DESCRIPTION || copy?.SUBHEADLINE || '',
    LANG: copy?.LANG || 'en',
  };

  // 4) Renderiza HTML no backend (dark default)
  const html = renderTemplate('review/review-dark.html', view);

  // 5) Retorna sem quebrar o front: continua mandando copy+image e adiciona html
  return {
    copy,
    image,
    html,
  };
}

module.exports = {
  generate,
};
