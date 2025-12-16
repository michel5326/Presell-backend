const express = require("express");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

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
  const file = path.join(templatesDir, `template-${templateId}.html`);
  return fs.existsSync(file) ? file : null;
}

async function uploadToR2(localPath, remoteKey) {
  const fileBuffer = fs.readFileSync(localPath);

  await s3.putObject({
    Bucket: BUCKET,
    Key: remoteKey,
    Body: fileBuffer,
    ContentType: "image/png",
  }).promise();

  return `${PUBLIC_BASE_URL}/${remoteKey}`;
}


// ======================================================
// ROTA PRINCIPAL
// ======================================================
app.post("/generate", async (req, res) => {
  const { templateId, productUrl, affiliateUrl } = req.body;

  if (!templateId || !productUrl || !affiliateUrl) {
    return res.status(400).json({ error: "Parâmetros obrigatórios faltando" });
  }

  const templatePath = findTemplate(templateId);
  if (!templatePath) {
    return res.status(404).json({ error: "Template não encontrado" });
  }

  const id = uuid();
  const desktopFile = `desktop-${id}.png`;
  const mobileFile = `mobile-${id}.png`;

  let browser;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    // DESKTOP
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(productUrl, { waitUntil: "networkidle2" });
    await page.screenshot({ path: desktopFile });
    await page.close();

    // MOBILE
    const pageMobile = await browser.newPage();
    await pageMobile.setViewport({ width: 390, height: 844, isMobile: true });
    await pageMobile.goto(productUrl, { waitUntil: "networkidle2" });
    await pageMobile.screenshot({ path: mobileFile });
    await pageMobile.close();

    const desktopUrl = await uploadToR2(desktopFile, `desktop/${desktopFile}`);
    const mobileUrl = await uploadToR2(mobileFile, `mobile/${mobileFile}`);

    safeUnlink(desktopFile);
    safeUnlink(mobileFile);

    let html = fs.readFileSync(templatePath, "utf8");
    html = html
      .replaceAll("{{DESKTOP_PRINT}}", desktopUrl)
      .replaceAll("{{MOBILE_PRINT}}", mobileUrl)
      .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl);

    res.set("Content-Type", "text/html; charset=utf-8").send(html);

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(3000, () => {
  console.log("🚀 API rodando");
});
