const { generateLegacyPage } = require("../engines/legacy");

async function legacyController(req, res) {
  try {
    const {
      templateId,
      productUrl,
      affiliateUrl,
      language = "en",
      legacyData = {},
      ...flatBody
    } = req.body;

    // ===== validações mínimas =====
    if (!templateId) {
      return res.status(400).json({ error: "missing_template_id" });
    }

    if (!productUrl || !productUrl.startsWith("http")) {
      return res.status(400).json({ error: "invalid_product_url" });
    }

    if (!affiliateUrl || !affiliateUrl.startsWith("http")) {
      return res.status(400).json({ error: "invalid_affiliate_url" });
    }

    const html = await generateLegacyPage({
      templateId,
      productUrl,
      affiliateUrl,
      language,
      legacyData,
      flatBody,
      userEmail: req.headers["x-user-email"]
    });

    res
      .status(200)
      .set("Content-Type", "text/html")
      .send(html);
  } catch (e) {
    console.error("❌ Legacy controller error:", e.message);
    res.status(502).json({ error: "generation_failed" });
  }
}

module.exports = legacyController;
