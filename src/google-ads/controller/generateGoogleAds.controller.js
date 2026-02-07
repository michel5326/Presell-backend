const { generateSearchCampaign } = require('../engine/generateSearchCampaign.engine');

async function generateGoogleAdsController(req, res) {
  try {
    const {
      keyword,
      language = 'en-US',
      baseUrl
    } = req.body;

    if (!keyword) {
      return res.status(400).json({
        error: 'keyword is required'
      });
    }

    const result = await generateSearchCampaign({
      keyword,
      language,
      baseUrl
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
