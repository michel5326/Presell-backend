const reviewEngine = require('../engines/review');
const robustaEngine = require('../engines/robusta');

async function generatePresellData(req, res) {
  try {
    const {
      type,
      productUrl,
      affiliateUrl,
      attempt = 0,
      theme, // ← FALTAVA ISSO
    } = req.body;

    if (!type || !productUrl || !affiliateUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    let result;

    if (type === 'review') {
      result = await reviewEngine.generate({
        productUrl,
        affiliateUrl,
        attempt,
        theme, // ← E ISSO
      });
    } else if (type === 'robusta') {
      result = await robustaEngine.generate({
        productUrl,
        affiliateUrl,
        attempt,
        theme, // ← opcional, mas consistente
      });
    } else {
      return res.status(400).json({
        error: 'Invalid type',
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('[presell.controller]', err);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}

module.exports = {
  generatePresellData,
};
