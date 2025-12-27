require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { chromium, devices } = require("playwright");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");

const app = express();

// ======================================================
// CORS
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
// OPENAI (ÚNICA INSTÂNCIA — CORRETA)
// ======================================================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
// PROMPTS IA
// ======================================================
function getPrompt(templateId) {
  if (templateId === "review") {
    return `
You are a senior direct-response copywriter.

Generate a JSON ONLY (no explanations, no markdown) for a HIGH-CONVERTING product REVIEW presell.

Goals:
- Maximize CTR
- Confirm buying decision
- Be compliant and Google-safe

Return exactly:

{
  "texts": {
    "HEADLINE": "",
    "SUBHEADLINE": "",
    "INTRO": "",
    "WHY_IT_WORKS": "",
    "BENEFITS_LIST": "",
    "SOCIAL_PROOF": "",
    "GUARANTEE": "",
    "FINAL_CTA": ""
  }
}
`;
  }

  if (templateId === "robusta") {
    return `
You are a senior conversion copywriter.

Generate a JSON ONLY (no explanations, no markdown) for a LONG-FORM ROBUST presell.

Goals:
- Remove objections
- Build trust
- Maximize conversion

Return exactly:

{
  "texts": {
    "HEADLINE": "",
    "SUBHEADLINE": "",
    "PROBLEM": "",
    "MECHANISM": "",
    "BENEFITS": "",
    "INGREDIENTS": "",
    "SOCIAL_PROOF": "",
    "SCAM_ALERT": "",
    "GUARANTEE": "",
    "FINAL_CTA": ""
  }
}
`;
  }

  return null;
}

// ======================================================
// GENERATE ROUTE
// ======================================================
app.post("/generate", async (req, res) => {
  try {
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

    const { templateId, productUrl, affiliateUrl, trackingScript } = req.body;

    if (!templateId || !productUrl || !affiliateUrl) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const templatePath = findTemplate(templateId);
    if (!templatePath) {
      return res.status(404).json({ error: "Template not found" });
    }

    const prompt = getPrompt(templateId);
    if (!prompt) {
      return res.status(400).json({ error: "Invalid templateId" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Product URL: ${productUrl}` },
      ],
      temperature: 0.7,
    });

    const aiData = JSON.parse(completion.choices[0].message.content);

    const id = uuid();
    const desktopFile = `desktop-${id}.png`;
    const mobileFile = `mobile-${id}.png`;

    const browser = await chromium.launch({ headless: true });

    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
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

    await browser.close();

    const desktopUrl = await uploadToR2(desktopFile, `desktop/${desktopFile}`);
    const mobileUrl = await uploadToR2(mobileFile, `mobile/${mobileFile}`);

    safeUnlink(desktopFile);
    safeUnlink(mobileFile);

    let html = fs.readFileSync(templatePath, "utf8");

    html = html
      .replaceAll("{{DESKTOP_PRINT}}", desktopUrl)
      .replaceAll("{{MOBILE_PRINT}}", mobileUrl)
      .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl);

    for (const [key, value] of Object.entries(aiData.texts)) {
      html = html.replaceAll(`{{${key}}}`, value);
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
  }
});

// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WORKER rodando na porta ${PORT}`);
});
