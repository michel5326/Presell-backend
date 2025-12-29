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
// IMAGE — MAIN PRODUCT
// ======================================================
async function extractMainImage(productUrl) {
  try {
    const res = await fetch(productUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    if (!res.ok) return "";

    const html = await res.text();
    const baseUrl = new URL(productUrl);

    const normalize = (url) => {
      if (!url) return "";
      if (url.startsWith("//")) return baseUrl.protocol + url;
      if (url.startsWith("/")) return baseUrl.origin + url;
      if (!url.startsWith("http")) return baseUrl.origin + "/" + url;
      return url;
    };

    let match = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i);
    if (match) return normalize(match[1]);

    match = html.match(/name=["']twitter:image["'][^>]+content=["']([^"']+)/i);
    if (match) return normalize(match[1]);

    const BLOCKED = [
      "logo","favicon","icon","sprite","order","buy","cta","button",
      "checkout","cart","badge","seal","star","banner","bg","hero"
    ];

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];

    for (const m of imgs) {
      const src = normalize(m[1]);
      const low = src.toLowerCase();

      if (
        !src ||
        low.startsWith("data:") ||
        low.endsWith(".svg") ||
        low.endsWith(".gif") ||
        BLOCKED.some(w => low.includes(w))
      ) continue;

      return src;
    }

    return "";
  } catch {
    return "";
  }
}

// ======================================================
// IMAGE — INGREDIENTS (ATÉ 3)
// ======================================================
async function extractIngredientImages(productUrl) {
  try {
    const res = await fetch(productUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    if (!res.ok) return "";

    const html = await res.text();
    const baseUrl = new URL(productUrl);

    const normalize = (url) => {
      if (!url) return "";
      if (url.startsWith("//")) return baseUrl.protocol + url;
      if (url.startsWith("/")) return baseUrl.origin + url;
      if (!url.startsWith("http")) return baseUrl.origin + "/" + url;
      return url;
    };

    const INCLUDE = [
      "ingredient","ingredients","formula","blend","extract","component"
    ];

    const EXCLUDE = [
      "logo","icon","order","buy","cta","button","checkout",
      "banner","bg","hero","seal","badge"
    ];

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
    const out = [];

    for (const m of imgs) {
      if (out.length >= 3) break;

      const src = normalize(m[1]);
      const low = src.toLowerCase();

      if (
        !src ||
        low.startsWith("data:") ||
        low.endsWith(".svg") ||
        low.endsWith(".gif") ||
        !INCLUDE.some(w => low.includes(w)) ||
        EXCLUDE.some(w => low.includes(w))
      ) continue;

      out.push(`<img src="${src}" alt="Ingredient" loading="lazy">`);
    }

    if (!out.length) return "";

    return `<div class="image-grid">\n${out.join("\n")}\n</div>`;
  } catch {
    return "";
  }
}

// ======================================================
// DEEPSEEK — SAFE CALL
// ======================================================
async function callDeepSeekSafe(prompt, language) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
            content: `Return ONLY valid JSON.
Keys: HEADLINE,SUBHEADLINE,INTRO,WHY_IT_WORKS,BENEFITS_LIST,SOCIAL_PROOF,GUARANTEE
Rules:
- BOFU tone
- Google Ads safe
- BENEFITS_LIST must be <li>
- Language: ${language}`,
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    const raw = data.choices[0].message.content.trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ======================================================
// BOFU REVIEW
// ======================================================
async function generateBofuReview({ templatePath, affiliateUrl, productUrl, language }) {
  const SAFE = " ";

  const ai = await callDeepSeekSafe(
    `Product URL: ${productUrl}\nGoal: Confirm purchase decision.`,
    language
  );

  const productImage = await extractMainImage(productUrl);
  const ingredientImages = await extractIngredientImages(productUrl);

  let html = fs.readFileSync(templatePath, "utf8");

  const data = {
    HEADLINE: ai?.HEADLINE || SAFE,
    SUBHEADLINE: ai?.SUBHEADLINE || SAFE,
    INTRO: ai?.INTRO || SAFE,
    WHY_IT_WORKS: ai?.WHY_IT_WORKS || SAFE,
    BENEFITS_LIST: ai?.BENEFITS_LIST || "<li></li>",
    SOCIAL_PROOF: ai?.SOCIAL_PROOF || SAFE,
    GUARANTEE: ai?.GUARANTEE || SAFE,
  };

  for (const [k, v] of Object.entries(data)) {
    html = html.replaceAll(`{{${k}}}`, v);
  }

  return html
    .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl)
    .replaceAll("{{PRODUCT_IMAGE}}", productImage || "")
    .replaceAll("{{INGREDIENT_IMAGES}}", ingredientImages || "")
    .replaceAll("{{BONUS_IMAGES}}", "")
    .replaceAll("{{TESTIMONIAL_IMAGES}}", "");
}

// ======================================================
// GENERATE
// ======================================================
app.post("/generate", async (req, res) => {
  if (req.headers["x-worker-token"] !== WORKER_TOKEN)
    return res.status(403).json({ error: "forbidden" });

  const userEmail = req.headers["x-user-email"];
  if (!userEmail)
    return res.status(401).json({ error: "user email missing" });

  const { data: access } = await supabaseAdmin
    .from("user_access")
    .select("access_until")
    .eq("email", userEmail)
    .single();

  if (!access || new Date(access.access_until) < new Date())
    return res.status(403).json({ error: "access expired" });

  const { templateId, productUrl, affiliateUrl, language = "en" } = req.body;
  const templatePath = findTemplate(templateId);
  if (!templatePath) return res.status(404).json({ error: "Template not found" });

  if (templateId === "review") {
    const html = await generateBofuReview({
      templatePath, affiliateUrl, productUrl, language
    });
    return res.status(200).set("Content-Type","text/html").send(html);
  }

  // ================= LEGACY =================
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

    let html = fs.readFileSync(templatePath, "utf8")
      .replaceAll("{{DESKTOP_PRINT}}", desktopUrl)
      .replaceAll("{{MOBILE_PRINT}}", mobileUrl)
      .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl);

    return res.status(200).set("Content-Type","text/html").send(html);

  } finally {
    if (browser) try { await browser.close(); } catch {}
  }
});

// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WORKER rodando na porta ${PORT}`);
});
