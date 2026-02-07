const { generateSearchCampaign } = require('../engine/generateSearchCampaign.engine');

async function generateGoogleAdsController(req, res) {
  try {
    const {
      keyword,
      productUrl,
      baseUrl,
      language = 'en-US'
    } = req.body;

    // 🔒 Validações obrigatórias
    if (!keyword) {
      return res.status(400).json({
        error: 'keyword is required'
      });
    }

    if (!productUrl) {
      return res.status(400).json({
        error: 'productUrl is required'
      });
    }

    if (!/^https?:\/\//i.test(productUrl)) {
      return res.status(400).json({
        error: 'productUrl must be a valid absolute URL'
      });
    }

    if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
      return res.status(400).json({
        error: 'baseUrl must be a valid absolute URL'
      });
    }

    const result = await generateSearchCampaign({
      keyword,
      language,
      productUrl, // 🔥 NOVO: URL REAL DO PRODUTO (SCRAPING / CONTEXTO)
      baseUrl     // 👉 continua sendo a URL da lead page
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
