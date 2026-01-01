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
  try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
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
    const res = await fetch(productUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
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
    const res = await fetch(productUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
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
   DEEPSEEK — GENERIC
========================= */
async function callDeepSeekWithRetry(systemPrompt, userPrompt, attempts=3) {
  for (let i=1;i<=attempts;i++) {
    try {
      const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body:JSON.stringify({
          model:"deepseek-chat",
          temperature:0.3,
          messages:[
            { role:"system", content: systemPrompt },
            { role:"user", content: userPrompt }
          ]
        })
      });

      const data = await r.json();
      const raw = data.choices[0].message.content;
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON");

      return JSON.parse(match[0]);
    } catch(e){
      if (i===attempts) throw e;
    }
  }
}

/* =========================
   BOFU REVIEW (INTOCADA)
========================= */
async function generateBofuReview({ templatePath, affiliateUrl, productUrl, language }) {
  const ai = await callDeepSeekWithRetry(
`Return ONLY valid JSON.
Required keys:
HEADLINE
SUBHEADLINE
INTRO
WHY_IT_WORKS
FORMULA_TEXT
BENEFITS_LIST
SOCIAL_PROOF
GUARANTEE

This page is BEFORE purchase.
This is a BOFU review page.
Language: ${language}`,
`Product URL: ${productUrl}`
  );

  const productImage = await extractMainImage(productUrl);
  const ingredientImages = await extractIngredientImages(productUrl);

  let html = fs.readFileSync(templatePath,"utf8");

  for (const [k,v] of Object.entries(ai)) {
    html = html.replaceAll(`{{${k}}}`, v);
  }

  return html
    .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl)
    .replaceAll("{{PRODUCT_IMAGE}}", productImage || "")
    .replaceAll("{{INGREDIENT_IMAGES}}", ingredientImages || "")
    .replaceAll("{{BONUS_IMAGES}}","")
    .replaceAll("{{TESTIMONIAL_IMAGES}}","");
}

/* =========================
   ROBUSTA (AJUSTADA)
========================= */
async function generateRobusta({ templatePath, affiliateUrl, productUrl }) {
  const ai = await callDeepSeekWithRetry(
`Return ONLY valid JSON.

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

This page is BEFORE purchase.
This is a BOFU robustness page.`,
`Product URL: ${productUrl}`
  );

  const productImage = await extractMainImage(productUrl);
  const ingredientImages = await extractIngredientImages(productUrl);

  let html = fs.readFileSync(templatePath,"utf8");

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
    FOOTER_DISCLAIMER: "This content is informational only."
  };

  for (const [k,v] of Object.entries({ ...fixed, ...ai })) {
    html = html.replaceAll(`{{${k}}}`, v);
  }

  return html
    .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl)
    .replaceAll("{{PRODUCT_IMAGE}}", productImage || "")
    .replaceAll("{{INGREDIENT_IMAGES}}", ingredientImages || "")
    .replaceAll("{{BONUS_IMAGES}}","")
    .replaceAll("{{TESTIMONIAL_IMAGES}}","");
}

/* =========================
   GENERATE
========================= */
app.post("/generate", async (req,res)=>{
  try{
    if (req.headers["x-worker-token"]!==WORKER_TOKEN)
      return res.status(403).json({error:"forbidden"});

    const userEmail = req.headers["x-user-email"];
    if (!userEmail) return res.status(401).json({error:"no user"});

    const { data: access } = await supabaseAdmin
      .from("user_access")
      .select("access_until")
      .eq("email",userEmail).single();

    if (!access || new Date(access.access_until)<new Date())
      return res.status(403).json({error:"expired"});

    const { templateId, productUrl, affiliateUrl, language="en", legacyData={}, ...flatBody } = req.body;

    const templatePath = findTemplate(templateId);
    if (!templatePath) return res.status(404).json({error:"no template"});

    if (templateId==="review") {
      const html = await generateBofuReview({templatePath,affiliateUrl,productUrl,language});
      return res.status(200).set("Content-Type","text/html").send(html);
    }

    if (templateId==="robusta") {
      const html = await generateRobusta({templatePath,affiliateUrl,productUrl});
      return res.status(200).set("Content-Type","text/html").send(html);
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

    const browser = await chromium.launch({headless:true});
    const p = await browser.newPage({viewport:{width:1366,height:768}});
    await p.goto(productUrl); await p.screenshot({path:d}); await p.close();

    const p2 = await browser.newPage(devices["iPhone 12"]);
    await p2.goto(productUrl); await p2.screenshot({path:m}); await p2.close();

    const du = await uploadToR2(d,`desktop/${d}`);
    const mu = await uploadToR2(m,`mobile/${m}`);

    safeUnlink(d); safeUnlink(m); await browser.close();

    let html = fs.readFileSync(templatePath,"utf8")
      .replaceAll("{{DESKTOP_PRINT}}",du)
      .replaceAll("{{MOBILE_PRINT}}",mu)
      .replaceAll("{{AFFILIATE_LINK}}",affiliateUrl);

    for (const [k,v] of Object.entries(finalLegacyData)) {
      html = html.replaceAll(`{{${k}}}`,String(v));
    }

    return res.status(200).set("Content-Type","text/html").send(html);

  } catch(e){
    console.error("❌",e.message);
    return res.status(502).json({error:"generation_failed",message:e.message});
  }
});

const PORT = process.env.PORT||3000;
app.listen(PORT,()=>console.log(`🚀 WORKER ${PORT}`));
