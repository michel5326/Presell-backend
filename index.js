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

/* =========================
   CORS
========================= */
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

/* =========================
   SUPABASE ADMIN
========================= */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   CLOUDFLARE R2 (LEGACY)
========================= */
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  signatureVersion: "v4",
  region: "auto",
});

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;

/* =========================
   HELPERS
========================= */
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

/* =========================
   IMAGE — MAIN PRODUCT
========================= */
async function extractMainImage(productUrl) {
  try {
    const res = await fetch(productUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return "";

    const html = await res.text();
    const base = new URL(productUrl);

    const normalize = (u) => {
      if (!u) return "";
      if (u.startsWith("//")) return base.protocol + u;
      if (u.startsWith("/")) return base.origin + u;
      if (!u.startsWith("http")) return base.origin + "/" + u;
      return u;
    };

    let m = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i);
    if (m) return normalize(m[1]);

    m = html.match(/name=["']twitter:image["'][^>]+content=["']([^"']+)/i);
    if (m) return normalize(m[1]);

    const BLOCK = ["logo","icon","order","buy","cta","checkout","badge","seal","bg","hero"];
    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];

    for (const i of imgs) {
      const src = normalize(i[1]);
      const low = src.toLowerCase();
      if (!src || low.startsWith("data:") || low.endsWith(".svg") || BLOCK.some(b=>low.includes(b))) continue;
      return src;
    }
    return "";
  } catch {
    return "";
  }
}

/* =========================
   IMAGE — INGREDIENTS
========================= */
async function extractIngredientImages(productUrl) {
  try {
    const res = await fetch(productUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return "";

    const html = await res.text();
    const base = new URL(productUrl);

    const normalize = (u) => {
      if (!u) return "";
      if (u.startsWith("//")) return base.protocol + u;
      if (u.startsWith("/")) return base.origin + u;
      if (!u.startsWith("http")) return base.origin + "/" + u;
      return u;
    };

    const INCLUDE = ["ingredient","ingredients","formula","blend","extract"];
    const EXCLUDE = ["logo","icon","order","buy","cta","checkout","banner","hero"];

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
    const out = [];

    for (const m of imgs) {
      if (out.length >= 3) break;
      const src = normalize(m[1]);
      const low = src.toLowerCase();
      if (!src || low.startsWith("data:") || low.endsWith(".svg")) continue;
      if (!INCLUDE.some(w=>low.includes(w)) || EXCLUDE.some(w=>low.includes(w))) continue;
      out.push(`<img src="${src}" alt="Ingredient" loading="lazy">`);
    }

    return out.length
      ? `<div class="image-grid">\n${out.join("\n")}\n</div>`
      : "";
  } catch {
    return "";
  }
}

/* =========================
   DEEPSEEK — REVIEW
========================= */
async function callDeepSeekWithRetry(prompt, language="en", attempts=3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
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

Required keys:
HEADLINE
SUBHEADLINE
INTRO
WHY_IT_WORKS
FORMULA_TEXT
BENEFITS_LIST
SOCIAL_PROOF
GUARANTEE

This is a BOFU review page.
This page is BEFORE purchase.
Language: ${language}
              `,
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      const data = await r.json();
      const raw = data.choices[0].message.content;
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON");

      return JSON.parse(match[0]);
    } catch (e) {
      if (i === attempts) throw e;
    }
  }
}

/* =========================
   BOFU REVIEW
========================= */
async function generateBofuReview({ templatePath, affiliateUrl, productUrl, language }) {
  const ai = await callDeepSeekWithRetry(
    `Product URL: ${productUrl}\nGoal: Help user decide before purchase.`,
    language
  );

  const productImage = await extractMainImage(productUrl);
  const ingredientImages = await extractIngredientImages(productUrl);

  let html = fs.readFileSync(templatePath, "utf8");

  const data = {
    HEADLINE: ai.HEADLINE,
    SUBHEADLINE: ai.SUBHEADLINE,
    INTRO: ai.INTRO,
    WHY_IT_WORKS: ai.WHY_IT_WORKS,
    FORMULA_TEXT: ai.FORMULA_TEXT,
    BENEFITS_LIST: ai.BENEFITS_LIST,
    SOCIAL_PROOF: ai.SOCIAL_PROOF,
    GUARANTEE: ai.GUARANTEE,
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

/* =========================
   GENERATE
========================= */
app.post("/generate", async (req, res) => {
  try {
    if (req.headers["x-worker-token"] !== WORKER_TOKEN)
      return res.status(403).json({ error: "forbidden" });

    const userEmail = req.headers["x-user-email"];
    if (!userEmail) return res.status(401).json({ error: "no user" });

    const { data: access } = await supabaseAdmin
      .from("user_access")
      .select("access_until")
      .eq("email", userEmail)
      .single();

    if (!access || new Date(access.access_until) < new Date())
      return res.status(403).json({ error: "expired" });

    const {
      templateId,
      productUrl,
      affiliateUrl,
      language = "en",
      legacyData = {}, // 👈 NOVO (OPCIONAL)
    } = req.body;

    const templatePath = findTemplate(templateId);
    if (!templatePath) return res.status(404).json({ error: "no template" });

    if (templateId === "review") {
      const html = await generateBofuReview({
        templatePath,
        affiliateUrl,
        productUrl,
        language,
      });
      return res.status(200).set("Content-Type", "text/html").send(html);
    }

    /* ===== LEGACY (INTACTO + PLACEHOLDERS OPCIONAIS) ===== */
    const id = uuid();
    const d = `desktop-${id}.png`;
    const m = `mobile-${id}.png`;

    const browser = await chromium.launch({ headless: true });

    const p = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await p.goto(productUrl);
    await p.screenshot({ path: d });
    await p.close();

    const p2 = await browser.newPage(devices["iPhone 12"]);
    await p2.goto(productUrl);
    await p2.screenshot({ path: m });
    await p2.close();

    const du = await uploadToR2(d, `desktop/${d}`);
    const mu = await uploadToR2(m, `mobile/${m}`);

    safeUnlink(d);
    safeUnlink(m);
    await browser.close();

    let html = fs.readFileSync(templatePath, "utf8")
      .replaceAll("{{DESKTOP_PRINT}}", du)
      .replaceAll("{{MOBILE_PRINT}}", mu)
      .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl);

    // 🔒 PLACEHOLDERS EXTRAS (SE EXISTIREM)
    for (const [key, value] of Object.entries(legacyData)) {
      html = html.replaceAll(`{{${key}}}`, String(value));
    }

    return res.status(200).set("Content-Type", "text/html").send(html);

  } catch (e) {
    console.error("❌", e.message);
    return res.status(502).json({
      error: "generation_failed",
      message: e.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 WORKER ${PORT}`));
