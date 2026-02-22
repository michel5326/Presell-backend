const { generateSearchCampaign } = require('../engine/generateSearchCampaign.engine');

async function generateGoogleAdsController(req, res) {
  try {
    const {
      keyword,
      language = 'en-US',
      baseUrl,
      intentMode = 'hybrid',
      intensityLevel = 'balanced' // novo campo estratégico
    } = req.body;

    if (!keyword) {
      return res.status(400).json({
        error: 'keyword is required'
      });
    }

    // 🔒 validação segura de intent
    const allowedModes = ['review', 'official', 'hybrid'];
    const safeIntentMode = allowedModes.includes(intentMode)
      ? intentMode
      : 'hybrid';

    // 🔥 validação segura de intensidade
    const allowedIntensity = ['safe', 'balanced', 'aggressive'];
    const safeIntensityLevel = allowedIntensity.includes(intensityLevel)
      ? intensityLevel
      : 'balanced';

    const result = await generateSearchCampaign({
      keyword,
      language,
      baseUrl,
      intentMode: safeIntentMode,
      intensityLevel: safeIntensityLevel
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