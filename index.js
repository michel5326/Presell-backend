require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
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
// HELPERS
// ======================================================
function findTemplate(templateId) {
  const file = path.join(process.cwd(), "templates", `${templateId}.html`);
  return fs.existsSync(file) ? file : null;
}

// ======================================================
// DEEPSEEK
// ======================================================
async function callDeepSeek(messages) {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// ======================================================
// IMAGE SCRAPING (HTML → IMAGES)
// ======================================================
async function scrapeImages(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const result = await page.evaluate(() => {
    const imgs = Array.from(document.images)
      .filter(img => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const src = img.src || "";
        return w >= 250 && h >= 250 && src.startsWith("http");
      })
      .map(img => ({
        src: img.src,
        context: img.closest("section,div")?.innerText?.toLowerCase() || ""
      }));

    const productImage = imgs[0]?.src || "";

    const filterGroup = (keywords, limit) =>
      imgs
        .filter(i => keywords.some(k => i.context.includes(k)))
        .slice(0, limit)
        .map(i => `<img src="${i.src}" alt="">`)
        .join("");

    const wrap = html =>
      html ? `<div class="image-grid">${html}</div>` : "";

    return {
      productImage,
      ingredientImages: wrap(
        filterGroup(["ingredient", "formula", "blend"], 6)
      ),
      bonusImages: wrap(
        filterGroup(["bonus", "free", "gift"], 4)
      ),
      testimonialImages: wrap(
        filterGroup(["review", "testimonial", "customer"], 4)
      ),
    };
  });

  await browser.close();
  return result;
}

// ======================================================
// PROMPTS
// ======================================================
function getPrompt(templateId) {
  if (templateId === "review") {
    return `
Return ONLY valid JSON.

Keys:
HEADLINE
SUBHEADLINE
INTRO
WHY_IT_WORKS
BENEFITS_LIST
SOCIAL_PROOF
GUARANTEE

Rules:
- Neutral BOFU tone
- Google Ads safe
- BENEFITS_LIST must be <li> items only
`;
  }

  if (templateId === "robusta") {
    return `
Return ONLY valid JSON.

Keys:
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
SOCIAL_PROOF_NOTE
SCAM_ALERT_TEXT
GUARANTEE_TEXT
DISCLAIMER_TEXT
`;
  }

  return null;
}

// ======================================================
// GENERATE ROUTE
// ======================================================
app.post("/generate", async (req, res) => {
  try {
    // SECURITY
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

    // INPUT
    const {
      templateId,
      productUrl,
      affiliateUrl,
      trackingScript,
      language = "en",
    } = req.body;

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

    // ======================
    // IA
    // ======================
    const aiData = await callDeepSeek([
  {
    role: "system",
    content: `${prompt}\n\nWrite all output strictly in ${language}.`,
  },
  {
    role: "user",
    content: `Product URL: ${productUrl}`,
  },
]);


    // ======================
    // IMAGES
    // ======================
    let images = {
  productImage: "",
  ingredientImages: "",
  bonusImages: "",
  testimonialImages: "",
};

try {
  images = await scrapeImages(productUrl);
} catch (e) {
  console.log("⚠️ Image scraping failed, continuing without images");
}


    // ======================
    // HTML
    // ======================
    let html = fs.readFileSync(templatePath, "utf8");

    html = html
      .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl)
      .replaceAll("{{PRODUCT_IMAGE}}", images.productImage)
      .replaceAll("{{INGREDIENT_IMAGES}}", images.ingredientImages)
      .replaceAll("{{BONUS_IMAGES}}", images.bonusImages)
      .replaceAll("{{TESTIMONIAL_IMAGES}}", images.testimonialImages);

    for (const [key, value] of Object.entries(aiData)) {
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
