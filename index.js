const express = require("express");
const { chromium, devices } = require("playwright");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const app = express();
app.use(express.json());

// ======================================================
// CLOUDFLARE R2
// ======================================================
const s3 = new AWS.S3({
  endpoint: "https://68f733511c324bf0523779ef257f22ef.r2.cloudflarestorage.com",
  accessKeyId: "403afe02bd5311fc143d2c66adbc3c03",
  secretAccessKey: "709369bff1f1a895ac66bfff66a09562e9824b99bed0dd463e1f7af6768a1a0a",
  signatureVersion: "v4",
  region: "auto",
});

const BUCKET = "presell-prints";
const PUBLIC_BASE_URL =
  "https://pub-47ce05af429144d2aba2d027ba5c3f66.r2.dev";

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

  const candidates = [
    `template-${templateId}.html`,
    `${templateId}.html`,
  ];

  for (const name of candidates) {
    const full = path.join(templatesDir, name);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

async function uploadToR2(localPath, remoteKey) {
  const buffer = fs.readFileSync(localPath);

  await s3.putObject({
    Bucket: BUCKET,
    Key: remoteKey,
    Body: buffer,
    ContentType: "image/png",
  }).promise();

  return `${PUBLIC_BASE_URL}/${remoteKey}`;
}

// ======================================================
// JOB EM BACKGROUND (PLAYWRIGHT)
// ======================================================
async function runJob({ templateId, productUrl, affiliateUrl }) {
  const id = uuid();
  const desktopFile = `desktop-${id}.png`;
  const mobileFile = `mobile-${id}.png`;

  let browser;

  try {
    console.log("▶️ Job iniciado:", id);

    const templatePath = findTemplate(templateId);
    if (!templatePath) throw new Error("Template não encontrado");

    browser = await chromium.launch({
      headless: true,
      timeout: 30000,
    });

    // DESKTOP
    const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
    });

    await page.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    await page.waitForSelector("body", { timeout: 5000 });
    await page.waitForTimeout(800);

    await page.screenshot({ path: desktopFile, fullPage: false });
    await page.close();

    // MOBILE
    const iphone = devices["iPhone 12"];
    const pageMobile = await browser.newPage({ ...iphone });

    await pageMobile.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    await pageMobile.waitForSelector("body", { timeout: 5000 });
    await pageMobile.waitForTimeout(800);

    await pageMobile.screenshot({ path: mobileFile, fullPage: false });
    await pageMobile.close();

    // UPLOAD
    const desktopUrl = await uploadToR2(desktopFile, `desktop/${desktopFile}`);
    const mobileUrl = await uploadToR2(mobileFile, `mobile/${mobileFile}`);

    safeUnlink(desktopFile);
    safeUnlink(mobileFile);

    let html = fs.readFileSync(templatePath, "utf8");
    html = html
      .replaceAll("{{DESKTOP_PRINT}}", desktopUrl)
      .replaceAll("{{MOBILE_PRINT}}", mobileUrl)
      .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl);

    console.log("✅ Job finalizado:", id);
    // por enquanto só logamos o sucesso

  } catch (err) {
    console.error("❌ Job erro:", err.message);
    safeUnlink(desktopFile);
    safeUnlink(mobileFile);
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

// ======================================================
// ROTA (RESPONDE RÁPIDO)
// ======================================================
app.post("/generate", (req, res) => {
  const { templateId, productUrl, affiliateUrl } = req.body;

  if (!templateId || !productUrl || !affiliateUrl) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }

  const jobId = uuid();

  setImmediate(() => {
    runJob({ templateId, productUrl, affiliateUrl });
  });

  return res.status(200).json({
    status: "processing",
    jobId,
  });
});

// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
});
