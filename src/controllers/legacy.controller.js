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
