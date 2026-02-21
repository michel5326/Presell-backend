const reviewEngine = require('../engines/review');
const robustaEngine = require('../engines/robusta');

function normalizeLang(lang) {
  if (!lang || typeof lang !== 'string') return 'en';
  const clean = lang.toLowerCase().slice(0, 2);
  return /^[a-z]{2}$/.test(clean) ? clean : 'en';
}

async function generatePresellData(req, res) {
  try {
    const {
      type,
      productUrl,
      affiliateUrl,
      attempt = 0,
      theme,
      template,
      trackingScript,
      productImageUrl,
      lang,
      youtubeUrl, // 🔥 ADICIONAR ISSO
    } = req.body;

    if (!type || !productUrl || !affiliateUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    const language = normalizeLang(lang);

    let result;

    if (type === 'review') {
      result = await reviewEngine.generate({
        productUrl,
        affiliateUrl,
        attempt,
        theme,
        template,
        trackingScript,
        productImageUrl,
        lang: language,
        youtubeUrl, // 🔥 PASSAR PARA O ENGINE
      });
    } else if (type === 'robusta') {
      result = await robustaEngine.generate({
        productUrl,
        affiliateUrl,
        attempt,
        theme,
        trackingScript,
        productImageUrl,
        lang: language,
      });
    } else {
      return res.status(400).json({
        error: 'Invalid type',
      });
    }

    console.log('================ PRESSELL DEBUG ================');
    console.log('[TYPE]', type);
    console.log('[LANG]', language);
    console.log('[TEMPLATE]', template || 'LEGACY');
    console.log('[IMAGE SOURCE]', productImageUrl ? 'FRONT' : 'AUTO');
    console.log('[YOUTUBE SOURCE]', youtubeUrl ? 'MANUAL' : 'AUTO'); // 🔥 opcional debug
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