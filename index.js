const express = require("express");
const cors = require("cors");
const { chromium, devices } = require("playwright");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ======================================================
// CORS — LEGACY
// ======================================================
app.use(
  cors({
    origin: [
      "https://clickpage.vercel.app",
      "https://clickpage.lovable.app",
    ],
    methods: ["POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "x-worker-token",
      "x-user-email",
    ],
  })
);

app.use(express.json());

const WORKER_TOKEN = process.env.WORKER_TOKEN;

// ======================================================
// SUPABASE ADMIN
// ======================================================
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  const file = path.join(process.cwd(), "templates", `${templateId}.html`);
  return fs.existsSync(file) ? file : null;
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
// BOFU — REVIEW (MVP, SEM IA, SEM IMAGENS)
// ======================================================
async function generateBofuReview({ templatePath, affiliateUrl }) {
  const SAFE = " ";

  const data = {
    HEADLINE: SAFE,
    SUBHEADLINE: SAFE,
    INTRO: SAFE,
    WHY_IT_WORKS: SAFE,
    BENEFITS_LIST: "<li></li>",
    SOCIAL_PROOF: SAFE,
    GUARANTEE: SAFE,
    FINAL_CTA: "Visit Official Website",
  };

  let html = fs.readFileSync(templatePath, "utf8");

  for (const [key, value] of Object.entries(data)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  html = html
    .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl)
    .replaceAll("{{PRODUCT_IMAGE}}", "")
    .replaceAll("{{INGREDIENT_IMAGES}}", "")
    .replaceAll("{{BONUS_IMAGES}}", "")
    .replaceAll("{{TESTIMONIAL_IMAGES}}", "");

  return html;
}

// ======================================================
// GENERATE — LEGACY + BOFU
// ======================================================
app.post("/generate", async (req, res) => {
  if (req.headers["x-worker-token"] !== WORKER_TOKEN) {
    return res.status(403).json({ error: "forbidden" });
  }

  const userEmail = req.headers["x-user-email"];
  if (!userEmail) {
    return res.status(401).json({ error: "user email missing" });
  }

  const { data: accessData } = await supabaseAdmin
    .from("user_access")
    .select("access_until")
    .eq("email", userEmail)
    .single();

  if (!accessData || new Date(accessData.access_until) < new Date()) {
    return res.status(403).json({ error: "access expired" });
  }

  const {
    templateId,
    productUrl,
    affiliateUrl,
    trackingScript,
    texts,
    numbers,
  } = req.body;

  if (!templateId || !affiliateUrl) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const templatePath = findTemplate(templateId);
  if (!templatePath) {
    return res.status(404).json({ error: "Template not found" });
  }

  // =========================
  // BOFU — REVIEW (MVP)
  // =========================
  if (templateId === "review") {
    const html = await generateBofuReview({
      templatePath,
      affiliateUrl,
    });

    return res
      .status(200)
      .set("Content-Type", "text/html; charset=utf-8")
      .send(html);
  }

  // =========================
  // LEGACY (INTOCADO)
  // =========================
  if (!productUrl) {
    return res.status(400).json({ error: "productUrl required for legacy" });
  }

  const id = uuid();
  const desktopFile = `desktop-${id}.png`;
  const mobileFile = `mobile-${id}.png`;

  let browser;

  try {
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
    });

    await page.goto(productUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: desktopFile });
    await page.close();

    const iphone = devices["iPhone 12"];
    const pageMobile = await browser.newPage({ ...iphone });

    await pageMobile.goto(productUrl, { waitUntil: "domcontentloaded" });
    await pageMobile.waitForTimeout(800);
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

    if (texts && typeof texts === "object") {
      for (const [key, value] of Object.entries(texts)) {
        if (typeof value === "string") {
          html = html.replaceAll(`{{${key}}}`, value);
        }
      }
    }

    if (numbers && typeof numbers === "object") {
      for (const [key, value] of Object.entries(numbers)) {
        if (typeof value === "number") {
          html = html.replaceAll(`{{${key}}}`, String(value));
        }
      }
    }

    if (trackingScript) {
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
      try { await browser.close(); } catch {}
    }
  }
});

// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WORKER rodando na porta ${PORT}`);
});
