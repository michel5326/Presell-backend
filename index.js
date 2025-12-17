const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

// health check
app.get("/", (req, res) => {
  res.status(200).send("Gateway online");
});

// gateway -> worker
app.post("/generate", async (req, res) => {
  const { templateId, productUrl, affiliateUrl } = req.body;

  if (!templateId || !productUrl || !affiliateUrl) {
    return res.status(400).json({
      error: "templateId, productUrl e affiliateUrl são obrigatórios",
    });
  }

  try {
    const response = await fetch(
      `${process.env.WORKER_URL}/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-worker-token": process.env.WORKER_TOKEN,
        },
        body: JSON.stringify({
          templateId,
          productUrl,
          affiliateUrl,
        }),
      }
    );

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error("Gateway error:", err.message);
    return res.status(500).json({ error: "gateway_failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Gateway rodando na porta ${PORT}`);
});
