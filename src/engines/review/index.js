const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');

async function generate({ productUrl, affiliateUrl, attempt }) {
  // 1) IA — intenção REVIEW
  const copy = await aiService.generateCopy({
    type: 'review',
    productUrl,
  });

  // 2) Imagem — determinística por attempt
  const image = await resolveProductImage(productUrl, attempt);

  // 3) Retorno de dados puros
  return {
    copy,
    image,
  };
}

module.exports = {
  generate,
};
