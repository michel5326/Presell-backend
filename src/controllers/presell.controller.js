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
      template,          // ✅ AGORA LIDO
      trackingScript,
      productImageUrl,
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
        template,        // ✅ AGORA REPASSADO
        trackingScript,
        productImageUrl,
      });
    } else if (type === 'robusta') {
      result = await robustaEngine.generate({
        productUrl,
        affiliateUrl,
        attempt,
        theme,
        trackingScript,
        productImageUrl,
      });
    } else {
      return res.status(400).json({
        error: 'Invalid type',
      });
    }

    console.log('================ PRESSELL DEBUG ================');
    console.log('[TYPE]', type);
    console.log('[TEMPLATE]', template || 'LEGACY'); // 👈 útil
    console.log('[IMAGE SOURCE]', productImageUrl ? 'FRONT' : 'AUTO');
    console.log('[IMAGE FINAL]', result?.image || 'EMPTY');
    console.log('[HTML LENGTH]', result?.html?.length || 0);
    console.log('[TRACKING_SCRIPT]', trackingScript ? 'PRESENT' : 'EMPTY');
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
