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
    origin: ["https://clickpage.vercel.app", "https://clickpage.lovable.app"],
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-worker-token", "x-user-email"],
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

/* ✅ GLOBAL PLACEHOLDERS */
function applyGlobals(html) {
  return html.replaceAll("{{CURRENT_YEAR}}", String(new Date().getFullYear()));
}

/* =========================
   ✅ URL NORMALIZER (PATCH)
========================= */
function normalizeUrl(u, base) {
  try {
    const url = new URL(u, base).href;
    return url.replace(/([^:]\/)\/+/g, "$1"); // remove double slashes in path
  } catch {
    return "";
  }
}

/* (NECESSÁRIO PARA O LEGACY FUNCIONAR) */
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

/* =========================
   IMAGE — BOTTLE (PRIMARY PRODUCT)
========================= */
async function extractBottleImage(productUrl) {
  try {
    const res = await fetch(productUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return "";

    const html = await res.text();
    const base = new URL(productUrl);
    const normalize = (u) => normalizeUrl(u, base);

    /* PRIORITY KEYWORDS (STRONG SIGNAL) */
    const INCLUDE = [
      "bottle",
      "product",
      "supplement",
      "capsule",
      "capsules",
      "jar",
      "container",
      "label",
    ];

    /* EXCLUDE ABSOLUTE */
    const EXCLUDE = [
      "banner",
      "hero",
      "bg",
      "background",
      "seal",
      "badge",
      "guarantee",
      "logo",
      "icon",
      "checkout",
      "order",
      "cta",
    ];

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];

    /* 1️⃣ FIRST PASS — SEMANTIC MATCH */
    for (const m of imgs) {
      const src = normalize(m[1]);
      const low = src.toLowerCase();

      if (!src || low.startsWith("data:") || low.endsWith(".svg")) continue;
      if (EXCLUDE.some((w) => low.includes(w))) continue;
      if (!INCLUDE.some((w) => low.includes(w))) continue;

      return src;
    }

    /* 2️⃣ FALLBACK — OG IMAGE (ONLY IF NOT BANNER-LIKE) */
    let og = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i);
    if (og) {
      const src = normalize(og[1]);
      const low = src.toLowerCase();
      if (!EXCLUDE.some((w) => low.includes(w))) return src;
    }

    /* 3️⃣ LAST RESORT — FIRST CLEAN IMAGE */
    for (const m of imgs) {
      const src = normalize(m[1]);
      const low = src.toLowerCase();

      if (!src || low.startsWith("data:") || low.endsWith(".svg")) continue;
      if (EXCLUDE.some((w) => low.includes(w))) continue;

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
    const normalize = (u) => normalizeUrl(u, base);

    const INCLUDE = ["ingredient", "ingredients", "formula", "blend", "extract"];
    const EXCLUDE = ["logo", "icon", "order", "buy", "cta", "checkout", "banner", "hero"];

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
    const out = [];

    for (const m of imgs) {
      if (out.length >= 3) break;
      const src = normalize(m[1]);
      const low = src.toLowerCase();
      if (!src || low.startsWith("data:") || low.endsWith(".svg")) continue;
      if (!INCLUDE.some((w) => low.includes(w)) || EXCLUDE.some((w) => low.includes(w))) continue;
      out.push(`<img src="${src}" alt="Ingredient" loading="lazy">`);
    }

    return out.length ? `<div class="image-grid">\n${out.join("\n")}\n</div>` : "";
  } catch {
    return "";
  }
}

/* =========================
   IMAGE — BONUS (ROBUSTA)
========================= */
async function extractBonusImages(productUrl) {
  try {
    const res = await fetch(productUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return "";

    const html = await res.text();
    const base = new URL(productUrl);
    const normalize = (u) => normalizeUrl(u, base);

    /* === BÔNUS REAIS (CONTEÚDO) === */
    const CONTENT_KEYWORDS = [
      "ebook",
      "pdf",
      "guide",
      "manual",
      "book",
      "report",
      "video",
      "training",
      "course",
      "module",
      "lesson",
    ];

    /* === NÃO SÃO BÔNUS === */
    const HARD_EXCLUDE = [
      "tick",
      "check",
      "icon",
      "badge",
      "seal",
      "logo",
      "banner",
      "hero",
      "bg",
      "arrow",
      "cta",
      "button",
      "step",
      "order",
      "checkout",
      "cart",
      "upsell",
      "downsell",
      "thank",
      "confirm",
      "secure",
    ];

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
    const out = [];

    for (const m of imgs) {
      if (out.length >= 3) break;

      const src = normalize(m[1]);
      if (!src) continue;

      const low = src.toLowerCase();

      /* --- filtros básicos --- */
      if (low.startsWith("data:")) continue;
      if (low.endsWith(".svg")) continue;

      /* --- exclui lixo visual --- */
      if (HARD_EXCLUDE.some((w) => low.includes(w))) continue;

      /* --- exige contexto de conteúdo real --- */
      if (!CONTENT_KEYWORDS.some((w) => low.includes(w))) continue;

      out.push(`<img src="${src}" alt="Bonus material" loading="lazy">`);
    }

    return out.length
      ? `<div class="image-grid">\n${out.join("\n")}\n</div>`
      : "";
  } catch {
    return "";
  }
}
/* =========================
   KIWIFY WEBHOOK (PASSO 1 - TESTE)
========================= */
app.post("/webhooks/kiwify", (req, res) => {
  console.log("✅ KIWIFY WEBHOOK CHEGOU");
  console.log("Payload:", JSON.stringify(req.body || {}, null, 2));
  return res.status(200).json({ ok: true });
});

/* =========================
   IMAGE — GUARANTEE
========================= */
async function extractGuaranteeImage(productUrl) {
  try {
    const res = await fetch(productUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return "";

    const html = await res.text();
    const base = new URL(productUrl);
    const normalize = (u) => normalizeUrl(u, base);

    const INCLUDE = ["guarantee", "moneyback", "money-back", "refund", "risk", "badge"];
    const EXCLUDE = ["logo", "icon", "order", "buy", "cta", "checkout", "hero", "banner"];

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];

    for (const m of imgs) {
      const src = normalize(m[1]);
      const low = src.toLowerCase();
      if (!src || low.startsWith("data:") || low.endsWith(".svg")) continue;
      if (!INCLUDE.some((w) => low.includes(w)) || EXCLUDE.some((w) => low.includes(w))) continue;

      return `<img src="${src}" alt="Guarantee" loading="lazy" style="max-width:190px;width:100%;height:auto;display:block;margin:0 auto 14px;border-radius:12px;">`;
    }

    return "";
  } catch {
    return "";
  }
}

/* =========================
   DEEPSEEK
========================= */
async function callDeepSeekWithRetry(systemPrompt, userPrompt, attempts = 3) {
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
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
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
    `You are generating copy for a BOFU review page used primarily with Google Search traffic.

CRITICAL CONTEXT:
- This page is shown BEFORE purchase.
- The user already knows the product.
- The goal is to CONFIRM the decision and REDUCE hesitation.
- This is NOT a VSL, NOT a long-form advertorial, NOT a medical article.

GUIDELINES (IMPORTANT, NOT OVERLY RESTRICTIVE):

AVOID ONLY THE FOLLOWING:
- Claiming to cure or treat diseases
- Making explicit medical diagnoses
- Mentioning doctors, prescriptions, or lab tests (e.g. PSA, blood work)
- Making hard guarantees of results

LANGUAGE FREEDOM:
- You MAY describe how the product is intended to work in practical terms
- You MAY explain ingredients and their commonly understood roles
- You MAY use confident, persuasive language
- You MAY highlight why the product stands out compared to generic alternatives

PREFERRED PHRASING (WHEN POSSIBLE):
- "designed to support"
- "intended to help"
- "many users report"
- "commonly used to support"

USER FEEDBACK / SOCIAL PROOF:
- Testimonials can describe noticeable improvements
- Avoid clinical measurements or medical validation
- Avoid specific timelines (e.g. exact days or weeks)

TONE & STYLE:
- Confident
- Direct
- Persuasive
- Clear
- Not overly cautious
- Not exaggerated or sensational

STRUCTURE:
- Decision-focused copy
- Clear sections
- No long storytelling
- No educational lectures

OUTPUT REQUIREMENTS (MANDATORY):

Return ONLY valid JSON.

Required keys (ALL are mandatory):
HEADLINE
SUBHEADLINE
INTRO
WHY_IT_WORKS
FORMULA_TEXT
BENEFITS_LIST
SOCIAL_PROOF
GUARANTEE

Do NOT include explanations, notes, or commentary.
Do NOT include markdown.

Language: ${language}`,
    `Product URL: ${productUrl}`
  );

  const productImage = await extractBottleImage(productUrl);
  const ingredientImages = await extractIngredientImages(productUrl);

  let html = fs.readFileSync(templatePath, "utf8");

  for (const [k, v] of Object.entries(ai)) {
    html = html.replaceAll(`{{${k}}}`, v);
  }

  html = html
    .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl)
    .replaceAll("{{PRODUCT_IMAGE}}", productImage || "")
    .replaceAll("{{INGREDIENT_IMAGES}}", ingredientImages || "")
    .replaceAll("{{BONUS_IMAGES}}", "")
    .replaceAll("{{TESTIMONIAL_IMAGES}}", "");

  /* ✅ aplica CURRENT_YEAR */
  html = applyGlobals(html);

  return html;
}

/* =========================
   ROBUSTA
========================= */
async function generateRobusta({ templatePath, affiliateUrl, productUrl, language = "en" }) {
  const ai = await callDeepSeekWithRetry(
    `Return ONLY valid JSON.

This page is shown immediately BEFORE the user clicks to the official website.
The user has already read a full review.
Your role is NOT to educate, but to CONFIRM the decision and REDUCE risk.

Tone:
- Confident
- Calm
- Direct
- No hype
- No exaggerated promises

Required keys:
PAGE_TITLE
META_DESCRIPTION
HEADLINE_MAIN
SUBHEADLINE_MAIN
PRIMARY_PROBLEM_TEXT
POSITIONING_STATEMENT
WHY_DIFFERENT_1
WHY_DIFFERENT_2
WHY_DIFFERENT_3
MECHANISM_STEP_1
MECHANISM_STEP_2
MECHANISM_STEP_3
WHO_SHOULD_1
WHO_SHOULD_2
WHO_SHOULD_3
WHO_NOT_1
WHO_NOT_2
WHO_NOT_3
SCAM_ALERT_TEXT
GUARANTEE_TEXT
DISCLAIMER_TEXT
FORMULA_TITLE
FORMULA_TEXT
TESTIMONIAL_TITLE
TESTIMONIAL_NOTICE_TEXT
TESTIMONIAL_CTA_TEXT

FORMULA SECTION GUIDELINES (CRITICAL):
- The formula section must be written at a structural level, not ingredient-by-ingredient
- Do NOT list, name, or assume specific ingredients unless explicitly stated on the official website
- Describe the formula as a multi-component or blended formulation when appropriate
- Focus on formulation intent, balance, and overall structure rather than individual components
- Avoid health claims, effectiveness statements, or medical outcomes
- Use calm, neutral, pre-purchase confirmation language
- The purpose of this section is to reinforce legitimacy and formulation coherence, not to educate

IMPORTANT — TESTIMONIAL SECTION:
- Do NOT invent testimonials
- Do NOT describe individual users
- Do NOT include names, quotes, or personal stories
- Do NOT claim specific results

The testimonial section must clearly state that:
- real customer testimonials are available on the official website
- this page does not reproduce or modify user feedback
- the goal is transparency and authenticity

Use neutral, compliance-safe language.

Output ONLY valid JSON.`,
    `Product URL: ${productUrl}`
  );

  /* ===== IMAGES ===== */
  const productImage = await extractBottleImage(productUrl);
  const ingredientImages = await extractIngredientImages(productUrl);
  const bonusImages = await extractBonusImages(productUrl);
  const guaranteeImage = await extractGuaranteeImage(productUrl);

  /* ===== TESTIMONIAL FALLBACK (MULTI-LANGUAGE) ===== */
  const testimonialFallback = {
    en: {
      title: "What customers are saying",
      text:
        "Real customer testimonials are available directly on the official website. " +
        "To preserve authenticity and accuracy, this page does not reproduce or modify individual user feedback.",
      cta: "View real testimonials on the official site",
    },
    pt: {
      title: "O que clientes reais dizem",
      text:
        "Depoimentos reais de clientes estão disponíveis diretamente no site oficial. " +
        "Para preservar a autenticidade, esta página não reproduz nem modifica avaliações individuais.",
      cta: "Ver depoimentos no site oficial",
    },
    es: {
      title: "Lo que dicen los clientes",
      text:
        "Los testimonios reales de clientes están disponibles directamente en el sitio oficial. " +
        "Para preservar la autenticidad, esta página no reproduce ni modifica opiniones individuales.",
      cta: "Ver testimonios en el sitio oficial",
    },
    fr: {
      title: "Ce que disent les clients",
      text:
        "Les témoignages réels de clients sont disponibles directement sur le site officiel. " +
        "Afin de préserver l’authenticité, cette page ne reproduit ni ne modifie les avis individuels.",
      cta: "Voir les témoignages sur le site officiel",
    },
  };

  /* ===== LOAD TEMPLATE ===== */
  let html = fs.readFileSync(templatePath, "utf8");

  /* ===== FIXED STRINGS ===== */
  const fixed = {
    SITE_BRAND: "Buyer Guide",
    UPDATED_DATE: new Date().toISOString().split("T")[0],
    CTA_BUTTON_TEXT: "Visit Official Website",
    DECISION_STAGE_LINE: "Before you finalize your order",
    PRIMARY_PROBLEM_TITLE: "The real problem",
    WHY_DIFFERENT_TITLE: "Why this is different",
    MECHANISM_TITLE: "How it works",
    WHO_SHOULD_USE_TITLE: "Who this is for",
    WHO_SHOULD_NOT_TITLE: "Who should avoid",
    SCAM_ALERT_TITLE: "Important notice",
    GUARANTEE_TITLE: "Guarantee",
    BONUS_TITLE: "Available bonuses",
    FOOTER_DISCLAIMER: "This content is informational only.",
  };

  /* ===== APPLY AI + FIXED COPY ===== */
  for (const [k, v] of Object.entries({ ...fixed, ...ai })) {
    html = html.replaceAll(`{{${k}}}`, v || "");
  }

  /* ===== APPLY IMAGES ===== */
  html = html
    .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl)
    .replaceAll("{{PRODUCT_IMAGE}}", productImage || "")
    .replaceAll("{{INGREDIENT_IMAGES}}", ingredientImages || "")
    .replaceAll("{{BONUS_IMAGES}}", bonusImages || "")
    .replaceAll("{{GUARANTEE_IMAGE}}", guaranteeImage || "");

  /* ===== APPLY TESTIMONIAL TEXT (AI + FALLBACK) ===== */
  const lang = (language || "en").toLowerCase();
  const t = testimonialFallback[lang] || testimonialFallback.en;

  html = html
    .replaceAll("{{TESTIMONIAL_TITLE}}", ai.TESTIMONIAL_TITLE || t.title)
    .replaceAll("{{TESTIMONIAL_NOTICE_TEXT}}", ai.TESTIMONIAL_NOTICE_TEXT || t.text)
    .replaceAll("{{TESTIMONIAL_CTA_TEXT}}", ai.TESTIMONIAL_CTA_TEXT || t.cta);

  /* ===== GLOBAL PLACEHOLDERS ===== */
  html = applyGlobals(html);

  return html;
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
      legacyData = {},
      ...flatBody
    } = req.body;

    const templatePath = findTemplate(templateId);
    if (!templatePath) return res.status(404).json({ error: "no template" });

    if (templateId.startsWith("review")) {
      const html = await generateBofuReview({
        templatePath,
        affiliateUrl,
        productUrl,
        language,
      });
      return res.status(200).set("Content-Type", "text/html").send(html);
    }

    if (templateId.startsWith("robusta")) {
      const html = await generateRobusta({
        templatePath,
        affiliateUrl,
        productUrl,
      });
      return res.status(200).set("Content-Type", "text/html").send(html);
    }

    /* ===== LEGACY (INTOCADO) ===== */
    const finalLegacyData = { ...legacyData, ...flatBody };
    delete finalLegacyData.templateId;
    delete finalLegacyData.productUrl;
    delete finalLegacyData.affiliateUrl;
    delete finalLegacyData.language;

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

    for (const [k, v] of Object.entries(finalLegacyData)) {
      html = html.replaceAll(`{{${k}}}`, String(v));
    }

    /* ✅ aplica CURRENT_YEAR também no legacy */
    html = applyGlobals(html);

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