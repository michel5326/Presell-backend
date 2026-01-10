const aiService = require('../../services/ai');
const { resolveProductImage } = require('../image-resolver');

async function generate({ productUrl, affiliateUrl, attempt }) {
  // 1) IA — intenção ROBUSTA
  const copy = await aiService.generateCopy({
  type: "robusta",
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
