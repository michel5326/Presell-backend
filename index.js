const express = require("express");
const cors = require("cors"); // ✅ NOVO
const { chromium, devices } = require("playwright");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const app = express();

// ======================================================
// ✅ CORS — TEM QUE VIR ANTES DAS ROTAS
// ======================================================
app.use(
  cors({
    origin: [
      "https://clickpage.vercel.app",
      "https://clickpage.lovable.app",
    ],
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-worker-token"],
  })
);

// garante preflight

app.use(express.json());

const WORKER_TOKEN = process.env.WORKER_TOKEN;

// ======================================================
// CLOUDFLARE R2
// ======================================================
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  signatureVersion: "v4",
  region: "auto",
});

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;

// ======================================================
// HELPERS
// ======================================================
function safeUnlink(file) {
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {}
}

function findTemplate(templateId) {
  const templatesDir = path.join(process.cwd(), "templates");
  const file = path.join(templatesDir, `${templateId}.html`);
  return fs.existsSync(file) ? file : null;
}

async function uploadToR2(localPath, remoteKey) {
  const buffer = fs.readFileSync(localPath);

  await s3
    .putObject({
      Bucket: BUCKET,
      Key: remoteKey,
      Body: buffer,
      ContentType: "image/png",
    })
    .promise();

  return `${PUBLIC_BASE_URL}/${remoteKey}`;
}

// ======================================================
// ROUTE
// ======================================================
app.post("/generate", async (req, res) => {
  if (req.headers["x-worker-token"] !== WORKER_TOKEN) {
    return res.status(403).json({ error: "forbidden" });
  }

  const {
    templateId,
    productUrl,
    affiliateUrl,
    trackingScript,
  } = req.body;

  if (!templateId || !productUrl || !affiliateUrl) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const templatePath = findTemplate(templateId);
  if (!templatePath) {
    return res.status(404).json({
      error: `Template '${templateId}.html' não encontrado`,
    });
  }

  const id = uuid();
  const desktopFile = `desktop-${id}.png`;
  const mobileFile = `mobile-${id}.png`;

  let browser;

  try {
    browser = await chromium.launch({ headless: true });

    // DESKTOP
    const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
    });

    await page.goto(productUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: desktopFile, fullPage: false });
    await page.close();

    // MOBILE
    const iphone = devices["iPhone 12"];
    const pageMobile = await browser.newPage({ ...iphone });

    await pageMobile.goto(productUrl, { waitUntil: "domcontentloaded" });
    await pageMobile.waitForTimeout(800);
    await pageMobile.screenshot({ path: mobileFile, fullPage: false });
    await pageMobile.close();

    // UPLOAD R2
    const desktopUrl = await uploadToR2(
      desktopFile,
      `desktop/${desktopFile}`
    );
    const mobileUrl = await uploadToR2(
      mobileFile,
      `mobile/${mobileFile}`
    );

    safeUnlink(desktopFile);
    safeUnlink(mobileFile);

    // TEMPLATE
    let html = fs.readFileSync(templatePath, "utf8");
    html = html
      .replaceAll("{{DESKTOP_PRINT}}", desktopUrl)
      .replaceAll("{{MOBILE_PRINT}}", mobileUrl)
      .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl);

    if (trackingScript && typeof trackingScript === "string") {
      html = html.replace("</body>", `${trackingScript}\n</body>`);
    }

    return res
      .status(200)
      .set("Content-Type", "text/html; charset=utf-8")
      .send(html);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
});

// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WORKER rodando na porta ${PORT}`);
});
