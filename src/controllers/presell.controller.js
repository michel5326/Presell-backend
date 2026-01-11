const reviewEngine = require('../engines/review');
const robustaEngine = require('../engines/robusta');

async function generatePresellData(req, res) {
  try {
    const {
      type,
      productUrl,
      affiliateUrl,
      attempt = 0,
      theme,
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
        theme,
      });
    } else if (type === 'robusta') {
      result = await robustaEngine.generate({
        productUrl,
        affiliateUrl,
        attempt,
        theme,
      });
    } else {
      return res.status(400).json({
        error: 'Invalid type',
      });
    }

    // 🔥 DEBUG CRÍTICO (ESTILO FRANK)
    console.log('================ PRESSELL DEBUG ================');
    console.log('[TYPE]', type);
    console.log('[COPY FROM AI]', result?.copy);
    console.log('[IMAGE]', result?.image ? 'OK' : 'EMPTY');
    console.log('[HTML LENGTH]', result?.html?.length || 0);
    console.log('================================================');

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
