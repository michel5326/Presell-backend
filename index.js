require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { chromium, devices } = require("playwright");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch");

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
// SUPABASE ADMIN
// ======================================================
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ======================================================
// CLOUDFLARE R2 (LEGACY)
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
// IMAGE EXTRACTION (OG / TWITTER)
// ======================================================
async function extractMainImage(productUrl) {
  try {
    const res = await fetch(productUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      redirect: "follow",
    });

    if (!res.ok) return "";

    const html = await res.text();

    const baseUrl = new URL(productUrl);

    // og:image
    let match = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    );

    let imageUrl = match?.[1] || "";

    // twitter:image fallback
    if (!imageUrl) {
      match = html.match(
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
      );
      imageUrl = match?.[1] || "";
    }

    if (!imageUrl) {
      console.log("⚠️ No og:image found");
      return "";
    }

    // Resolve relative URLs
    if (imageUrl.startsWith("/")) {
      imageUrl = baseUrl.origin + imageUrl;
    }

    if (!imageUrl.startsWith("http")) {
      imageUrl = baseUrl.origin + "/" + imageUrl;
    }

    return imageUrl;
  } catch (err) {
    console.log("⚠️ Image extraction failed:", err.message);
    return "";
  }
}


// ======================================================
// DEEPSEEK — SAFE CALL
// ======================================================
async function callDeepSeekSafe(prompt, language = "en") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: `
Return ONLY valid JSON.

Keys:
HEADLINE
SUBHEADLINE
INTRO
WHY_IT_WORKS
BENEFITS_LIST
SOCIAL_PROOF
GUARANTEE
FINAL_CTA

Rules:
- BOFU tone
- Google Ads safe
- BENEFITS_LIST must be <li> items only
- Write everything in ${language}
`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    const raw = data.choices[0].message.content.trim();

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("Invalid JSON from DeepSeek");
    }

    return JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    console.error("❌ DeepSeek failed:", err.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ======================================================
// BOFU — REVIEW
// ======================================================
async function generateBofuReview({
  templatePath,
  affiliateUrl,
  productUrl,
  language,
}) {
  const SAFE = " ";

  const aiData = await callDeepSeekSafe(
    `
You are writing a BOFU product review page.

Product URL:
${productUrl}

Goal:
Confirm purchase decision and send the user to the official website.

Do NOT educate.
Do NOT exaggerate.
Be concise, clear and conversion-focused.
`,
    language
  );

  const productImage = await extractMainImage(productUrl);

  const data = {
    HEADLINE: aiData?.HEADLINE || SAFE,
    SUBHEADLINE: aiData?.SUBHEADLINE || SAFE,
    INTRO: aiData?.INTRO || SAFE,
    WHY_IT_WORKS: aiData?.WHY_IT_WORKS || SAFE,
    BENEFITS_LIST: aiData?.BENEFITS_LIST || "<li></li>",
    SOCIAL_PROOF: aiData?.SOCIAL_PROOF || SAFE,
    GUARANTEE: aiData?.GUARANTEE || SAFE,
    FINAL_CTA: aiData?.FINAL_CTA || "Visit Official Website",
  };

  let html = fs.readFileSync(templatePath, "utf8");

  for (const [key, value] of Object.entries(data)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  html = html
    .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl)
    .replaceAll("{{PRODUCT_IMAGE}}", productImage || "")
    .replaceAll("{{INGREDIENT_IMAGES}}", "")
    .replaceAll("{{BONUS_IMAGES}}", "")
    .replaceAll("{{TESTIMONIAL_IMAGES}}", "");

  return html;
}

// ======================================================
// GENERATE
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
    language = "en",
  } = req.body;

  if (!templateId || !affiliateUrl) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (templateId === "review" && !productUrl) {
    return res.status(400).json({ error: "productUrl required for BOFU review" });
  }

  const templatePath = findTemplate(templateId);
  if (!templatePath) {
    return res.status(404).json({ error: "Template not found" });
  }

  // =========================
  // BOFU — REVIEW
  // =========================
  if (templateId === "review") {
    const html = await generateBofuReview({
      templatePath,
      affiliateUrl,
      productUrl,
      language,
    });

    return res
      .status(200)
      .set("Content-Type", "text/html; charset=utf-8")
      .send(html);
  }

  // =========================
  // LEGACY
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
