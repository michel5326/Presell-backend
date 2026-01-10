const express = require("express");
const router = express.Router();

const { generateCopy } = require("../../../services/ai");

router.post("/ai-test", async (req, res) => {
  try {
    const { type, productUrl } = req.body;

    if (!type || !productUrl) {
      return res.status(400).json({
        error: "type and productUrl are required",
      });
    }

    const result = await generateCopy({
      type,
      productUrl,
    });

    return res.json({
      ok: true,
      result,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

module.exports = router;
