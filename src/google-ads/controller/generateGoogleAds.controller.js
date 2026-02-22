const { generateSearchCampaign } = require('../engine/generateSearchCampaign.engine');

async function generateGoogleAdsController(req, res) {
  try {
    const {
      keyword,
      language = 'en-US',
      baseUrl,
      intentMode = 'hybrid' // novo campo com default seguro
    } = req.body;

    if (!keyword) {
      return res.status(400).json({
        error: 'keyword is required'
      });
    }

    // validação simples opcional (proteção extra)
    const allowedModes = ['review', 'official', 'hybrid'];
    const safeIntentMode = allowedModes.includes(intentMode)
      ? intentMode
      : 'hybrid';

    const result = await generateSearchCampaign({
      keyword,
      language,
      baseUrl,
      intentMode: safeIntentMode
    });

    return res.json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error('[Google Ads Generator]', err.message);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}

module.exports = {
  generateGoogleAdsController
};