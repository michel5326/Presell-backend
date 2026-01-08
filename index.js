/* =========================
   ENV
========================= */
require("dotenv").config();

/* =========================
   DEPENDÊNCIAS
========================= */
const express = require("express");
const cors = require("cors");
const { chromium, devices } = require("playwright");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch");

/* =========================
   APP
========================= */
const app = express();

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: [
      "https://clickpage.vercel.app",
      "https://clickpage.lovable.app",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:8080",
      "http://localhost:3000"
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

/* =========================
   WORKER TOKEN
========================= */
const WORKER_TOKEN = process.env.WORKER_TOKEN;

if (!WORKER_TOKEN) {
  console.error("❌ Missing WORKER_TOKEN");
  process.exit(1);
}

/* =========================
   SUPABASE ADMIN
========================= */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

console.log("✅ Supabase Admin inicializado");

/* =========================
   WEBHOOK — KIWIFY
========================= */
app.post("/webhooks/kiwify", async (req, res) => {
  try {
    const body = req.body;

    console.log("🔔 KIWIFY WEBHOOK RECEBIDO");
    console.log(JSON.stringify(body, null, 2));

    if (body?.webhook_event_type !== "order_approved") {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const email = body?.Customer?.email;

    if (!email) {
      console.error("❌ Email ausente");
      return res.status(200).json({ ok: false });
    }

    const accessUntil = new Date();
    accessUntil.setMonth(accessUntil.getMonth() + 6);

    const { error } = await supabaseAdmin
      .from("user_access")
      .upsert(
        {
          email,
          access_until: accessUntil.toISOString(),
        },
        { onConflict: "email" }
      );

    if (error) {
      console.error("❌ Erro ao salvar acesso:", error.message);
      return res.status(200).json({ ok: false });
    }

    console.log("✅ Acesso liberado para:", email);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("🔥 Erro no webhook:", e.message);
    return res.status(200).json({ ok: false });
  }
});

/* =========================
   AUTH — MAGIC LINK LOGIN
========================= */
app.post("/auth/login", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email_required" });
    }

    // 1️⃣ verifica se tem acesso
    const { data: access } = await supabaseAdmin
      .from("user_access")
      .select("access_until")
      .eq("email", email)
      .single();

    if (!access || new Date(access.access_until) < new Date()) {
      return res.status(403).json({ error: "access_denied" });
    }

    // 2️⃣ envia magic link
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: "https://clickpage.vercel.app",
      },
    });

    if (error) {
      console.error("❌ Erro magic link:", error.message);
      return res.status(500).json({ error: "magic_link_failed" });
    }

    console.log("📩 Magic link enviado para:", email);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("❌ Login error:", e.message);
    return res.status(500).json({ error: "internal_error" });
  }
});

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

/* =========================
   GLOBAL PLACEHOLDERS
========================= */
function applyGlobals(html) {
  return html.replaceAll("{{CURRENT_YEAR}}", String(new Date().getFullYear()));
}

/* =========================
   URL NORMALIZER (DEFINITIVO) - CORRIGIDO
========================= */
function normalizeUrl(u, base) {
  try {
    if (!u) return "";
    let s = String(u).trim();

    // URLs protocol-relative
    if (s.startsWith("//")) {
      return base.protocol + s;
    }

    if (s.startsWith("/")) return base.origin + s;
    if (/^https?:\/\//i.test(s)) return s;

    return new URL(s, base.href).href;
  } catch {
    return "";
  }
}


/* =========================
   IMAGE VALIDATOR (GLOBAL) - CORRIGIDO
========================= */
async function validateImageUrl(url) {
  if (!url) return "";

  let u = String(url).trim();

  // Remove barras duplas consecutivas após o protocolo
  u = u.replace(/(https?:\/\/[^\/]+)\/\//g, '$1/');
  
  // bloqueios básicos
  if (!/^https?:\/\//i.test(u)) return "";
  if (u.startsWith("data:")) return "";
  if (/\.svg(\?|#|$)/i.test(u)) return "";

  // aceita imagens mesmo sem extensão (CDNs modernas)
  return u;
}

/* =========================
   DEBUG PRODENTIM
========================= */
async function debugProdentim(productUrl) {
  console.log("🔍 DEBUG PRODENTIM INICIADO");
  
  try {
    // 1. Testar fetch básico
    const res = await fetch(productUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
    });
    
    console.log("📡 Status:", res.status);
    console.log("📡 Content-Type:", res.headers.get("content-type"));
    
    const html = await res.text();
    console.log("📄 HTML length:", html.length);
    
    // 2. Procurar todas as imagens
    const base = new URL(productUrl);
    const imgs = [...html.matchAll(/<img[^>]+>/gi)];
    console.log("🖼️ Total de imagens encontradas:", imgs.length);
    
    // 3. Listar as primeiras 10 imagens
    console.log("📋 Primeiras 10 imagens:");
    imgs.slice(0, 10).forEach((img, i) => {
      const tag = img[0];
      const src = tag.match(/src=["']([^"']+)["']/i);
      const dataSrc = tag.match(/data-src=["']([^"']+)["']/i);
      console.log(`  ${i + 1}. src: ${src ? src[1] : 'N/A'}`);
      console.log(`     data-src: ${dataSrc ? dataSrc[1] : 'N/A'}`);
    });
    
    // 4. Procurar og:image
    const og = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i);
    console.log("🏷️ OG Image:", og ? og[1] : "Não encontrada");
    
    return { success: true, imageCount: imgs.length };
    
  } catch (error) {
    console.error("🔥 Erro no debug:", error.message);
    return { success: false, error: error.message };
  }
}

/* =========================
   FALLBACK 1 — LARGEST IMAGE (HTML)
========================= */
async function extractLargestImage(productUrl) {
  try {
    const res = await fetch(productUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return "";

    const html = await res.text();
    const base = new URL(productUrl);

    let best = { src: "", area: 0 };

    for (const m of html.matchAll(/<img([^>]+)>/gi)) {
      const tag = m[1];

      const srcMatch =
        tag.match(/src=["']([^"']+)["']/i) ||
        tag.match(/data-src=["']([^"']+)["']/i) ||
        tag.match(/data-original=["']([^"']+)["']/i) ||
        tag.match(/data-lazy=["']([^"']+)["']/i);

      if (!srcMatch) continue;

      const src = normalizeUrl(srcMatch[1], base);
      if (!src || src.startsWith("data:") || src.endsWith(".svg")) continue;

      const low = src.toLowerCase();
      if (/(logo|icon|badge|banner|bonus|price|star|seal)/i.test(low)) continue;

      const w = tag.match(/width=["']?(\d+)/i);
      const h = tag.match(/height=["']?(\d+)/i);
      if (!w || !h) continue;

      const area = Number(w[1]) * Number(h[1]);
      if (area > best.area) best = { src, area };
    }

    return best.src;
  } catch {
    return "";
  }
}

/* =========================
   FALLBACK 2 — PLAYWRIGHT (PRIMEIRA DOBRA)
========================= */
async function extractHeroImageWithPlaywright(productUrl) {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      userAgent: "Mozilla/5.0",
    });

    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);

    const img = await page.evaluate(() => {
      const vh = window.innerHeight;
      const bad = /(logo|icon|badge|banner|bonus|price|star|seal|bg)/i;

      return [...document.images]
        .map(img => {
          const r = img.getBoundingClientRect();
          return {
            src: img.currentSrc || img.src,
            area: r.width * r.height,
            top: r.top,
          };
        })
        .filter(i =>
          i.src &&
          i.area > 20000 &&
          i.top >= -50 &&
          i.top < vh &&
          !bad.test(i.src) &&
          !i.src.startsWith("data:") &&
          !i.src.endsWith(".svg")
        )
        .sort((a, b) => b.area - a.area)[0]?.src || "";
    });

    return img;
  } catch {
    return "";
  } finally {
    await browser.close();
  }
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
   IMAGE RESOLVER — RANKING ENGINE (FINAL) - CORRIGIDO
========================= */
async function resolveHeroProductImage(productUrl) {
  console.log(`🔍 Resolvendo imagem para: ${productUrl}`);
  
  try {
    const res = await fetch(productUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
    });
    if (!res.ok) {
      console.log(`❌ Fetch falhou: ${res.status}`);
      return "";
    }

    const html = await res.text();
    const base = new URL(productUrl);

    /* =========================
       CENTRALIZED FILTERS
    ========================= */
    const BAD_IMAGE_RE =
      /(logo|icon|badge|star|check|seal|bg|cta|button|order|buy|checkout|cart|shop|banner)/i;

    /* =========================
       SAFE NET — OG IMAGE (NÃO BYPASSA RANKING)
    ========================= */
    let ogImage = "";
    const og = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i);
    if (og) {
      const ogSrc = normalizeUrl(og[1], base);
      if (ogSrc && !BAD_IMAGE_RE.test(ogSrc)) {
        ogImage = ogSrc;
        console.log(`🏷️ OG Image encontrada: ${ogSrc}`);
      }
    }

    const imgs = [...html.matchAll(/<img[^>]+>/gi)];

    let best = { src: "", score: 0 };
    let debug = [];

    for (const m of imgs) {
      const tag = m[0];

      // 🔥 CORREÇÃO CRÍTICA: srcset agora pega a MAIOR imagem
      const srcsetMatch = tag.match(/srcset=["']([^"']+)["']/i);
      let srcCandidate = "";

      if (srcsetMatch) {
        srcCandidate = srcsetMatch[1]
          .split(",")
          .map(s => s.trim().split(" ")[0])
          .pop(); // pega a MAIOR (última do array)
      }

      const srcMatch =
        srcCandidate ||
        tag.match(/src=["']([^"']+)["']/i)?.[1] ||
        tag.match(/data-src=["']([^"']+)["']/i)?.[1] ||
        tag.match(/data-original=["']([^"']+)["']/i)?.[1];

      if (!srcMatch) continue;

      const src = normalizeUrl(srcMatch, base);
      if (!src) continue;

      const low = src.toLowerCase();

      /* ❌ LIXO VISUAL ABSOLUTO */
      if (
        /^data:/i.test(low) ||
        low.endsWith(".svg") ||
        BAD_IMAGE_RE.test(low)
      ) continue;

      let score = 0;

      /* ✅ SEMÂNTICA FORTE (PRODUTO) */
      if (/(product|bottle|supplement|capsule|jar)/i.test(low)) {
        score += 25;
      }

      /* ✅ TAMANHO (PROXY DE IMPORTÂNCIA VISUAL) */
      const w = tag.match(/width=["']?(\d+)/i);
      const h = tag.match(/height=["']?(\d+)/i);

      if (w && h) {
        const area = Number(w[1]) * Number(h[1]);
        if (area > 40000) score += 30;
        else if (area > 20000) score += 20;
      } else {
        // imagem válida sem dimensões explícitas
        score += 10;
      }

      /* ✅ POSIÇÃO NO HTML (PRIMEIRA DOBRA LÓGICA) */
      const position = html.indexOf(m[0]);
      if (position > -1 && position < html.length * 0.25) {
        score += 40;
      }

      debug.push({ src, score });

      if (score > best.score) {
        best = { src, score };
      }
    }

    /* =========================
       FALLBACK — ASSETS SOLTOS (CSS / JS / HTML CRU)
    ========================= */
    const assetCandidates = [...html.matchAll(
      /(?:https?:\/\/|\/)[^"'()\s]+?\.(png|jpe?g|webp|avif)(\?[^"'()\s]*)?/gi
    )]
      .map(m => normalizeUrl(m[0], base))
      .filter(u =>
        u &&
        !BAD_IMAGE_RE.test(u) &&
        !/\.svg(\?|#|$)/i.test(u)
      );

    const assetPreferred =
      assetCandidates.find(u =>
        /(product|bottle|supplement|introduc|container)/i.test(u)
      ) ||
      assetCandidates[0];

    /* 🔍 DEBUG OPCIONAL */
    if (process.env.DEBUG_IMAGES === "true") {
      console.log(
        "🏆 IMAGE RANKING (top 5):",
        debug.sort((a, b) => b.score - a.score).slice(0, 5)
      );
      console.log(
        "🔍 ASSET CANDIDATES (top 5):",
        assetCandidates.slice(0, 5)
      );
    }

    /* =========================
       ORDEM FINAL DE DECISÃO - CORRIGIDA
       🔥 CRÍTICO: Ranking primeiro, assets depois
    ========================= */
    
    // 1️⃣ RANKING TEM PRIORIDADE MÁXIMA
    if (best.src) {
      console.log(`✅ Imagem selecionada (ranking): ${best.src} (score: ${best.score})`);
      return best.src;
    }

    // 2️⃣ ASSETS SOLTOS (fallback para sites sem <img> tags)
    if (assetPreferred) {
      console.log(`✅ Imagem encontrada em assets: ${assetPreferred}`);
      return assetPreferred;
    }

    // 3️⃣ OG IMAGE
    if (ogImage) {
      console.log(`✅ Imagem selecionada (OG): ${ogImage}`);
      return ogImage;
    }

    // 4️⃣ BOTTLE EXTRACTION
    const bottle = await extractBottleImage(productUrl);
    if (bottle) {
      console.log(`✅ Imagem selecionada (bottle): ${bottle}`);
      return bottle;
    }

    // 5️⃣ PLAYWRIGHT (último recurso)
    const pw = await extractHeroImageWithPlaywright(productUrl);
    if (pw) {
      console.log(`✅ Imagem selecionada (playwright): ${pw}`);
      return pw;
    }

    console.log(`❌ Nenhuma imagem encontrada`);
    return "";
  } catch (error) {
    console.error(`🔥 Erro no resolveHeroProductImage: ${error.message}`);
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
   IMAGE — INGREDIENTS (UNIVERSAL)
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

    const INCLUDE = ["ingredient", "formula", "blend", "extract", "component", "herb", "plant"];
    const EXCLUDE = ["logo", "icon", "badge", "banner", "hero", "product", "bottle", "price"];

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
    const out = [];

    for (const m of imgs) {
      if (out.length >= 4) break; // Limite razoável
      
      const src = normalize(m[1]);
      if (!src || src.startsWith("data:") || src.endsWith(".svg")) continue;
      
      const low = src.toLowerCase();
      const imgTag = m[0].toLowerCase();
      
      // Verificar se é imagem de ingrediente
      const isIngredient = INCLUDE.some(word => 
        low.includes(word) || imgTag.includes(word)
      );
      
      const isExcluded = EXCLUDE.some(word => 
        low.includes(word) || imgTag.includes(word)
      );

      if (isIngredient && !isExcluded) {
        // Formato universal que funciona em qualquer template
        out.push(`<img src="${src}" alt="Natural ingredient" class="ingredient-img" loading="lazy">`);
      }
    }

    // Agrupar em grid se tiver várias imagens
    if (out.length > 1) {
      return `<div class="ingredient-grid">${out.join("\n")}</div>`;
    }
    
    return out.join("\n");
  } catch {
    return "";
  }
}

/* =========================
   IMAGE — BONUS (UNIVERSAL)
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
      "bonus",
      "free",
      "gift"
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

      out.push(`<img src="${src}" alt="Bonus material" class="bonus-img" loading="lazy">`);
    }

    // Formato universal
    if (out.length > 1) {
      return `<div class="bonus-grid">${out.join("\n")}</div>`;
    }
    
    return out.join("\n");
  } catch {
    return "";
  }
}

/* =========================
   IMAGE — GUARANTEE (UNIVERSAL)
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

    const INCLUDE = ["guarantee", "moneyback", "money-back", "refund", "risk", "badge", "seal", "certif"];
    const EXCLUDE = ["logo", "icon", "order", "buy", "cta", "checkout", "hero", "banner"];

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];

    for (const m of imgs) {
      const src = normalize(m[1]);
      const low = src.toLowerCase();
      if (!src || low.startsWith("data:") || low.endsWith(".svg")) continue;
      if (!INCLUDE.some((w) => low.includes(w)) || EXCLUDE.some((w) => low.includes(w))) continue;

      // Formato universal adaptável
      return `<img src="${src}" alt="Guarantee badge" class="guarantee-badge" loading="lazy">`;
    }

    return "";
  } catch {
    return "";
  }
}

/* =========================
   IMAGE — TESTIMONIAL (UNIVERSAL)
========================= */
async function extractTestimonialImages(productUrl) {
  try {
    const res = await fetch(productUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return "";

    const html = await res.text();
    const base = new URL(productUrl);
    const normalize = (u) => normalizeUrl(u, base);

    // Procurar imagens de testimonials/depoimentos
    const patterns = [
      /testimonial/i,
      /review/i,
      /customer/i,
      /user.*photo/i,
      /client/i,
      /feedback/i,
      /rating/i,
      /star/i
    ];

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
    const out = [];

    for (const m of imgs) {
      if (out.length >= 3) break; // Máximo 3 testimonials
      
      const src = normalize(m[1]);
      if (!src || src.startsWith("data:")) continue;
      
      const low = src.toLowerCase();
      const imgTag = m[0].toLowerCase();
      
      // Filtrar imagens irrelevantes
      if (/(logo|icon|badge|banner|hero|product|bottle)/i.test(low)) continue;
      
      // Verificar se parece com testimonial
      const isTestimonial = patterns.some(pattern => 
        pattern.test(low) || pattern.test(imgTag)
      );

      if (isTestimonial) {
        // Formato universal adaptável
        out.push(`
<div class="testimonial-item">
  <img src="${src}" alt="Customer testimonial" class="testimonial-img" loading="lazy">
  <p class="testimonial-text">"Positive feedback from satisfied user."</p>
  <p class="testimonial-author">- Happy Customer</p>
</div>`);
      }
    }

    // Se não encontrar testimonials específicos, usar fallback genérico
    if (out.length === 0) {
      return `
<div class="testimonial-item">
  <div class="testimonial-img-placeholder">👤</div>
  <p class="testimonial-text">"Many users report positive experiences with this product."</p>
  <p class="testimonial-author">- Satisfied User</p>
</div>`;
    }

    return out.join("\n");
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
   BOFU REVIEW — SISTEMA UNIVERSAL PARA QUALQUER TEMPLATE
========================= */
async function generateBofuReview({
  templatePath,
  affiliateUrl,
  productUrl,
  language,
}) {
  console.log(`🎯 generateBofuReview UNIVERSAL chamado para: ${productUrl}`);
  console.log(`📁 Template path: ${templatePath}`);
  console.log(`🔗 Affiliate URL: ${affiliateUrl}`);

  try {
    /* =========================
       1️⃣ ANALISAR O TEMPLATE PARA DETECTAR NECESSIDADES
    ========================= */
    const templateContent = fs.readFileSync(templatePath, "utf8");
    console.log(`📄 Template carregado (${templateContent.length} chars)`);

    // Detectar tipo de template
    const isBootstrapTemplate = templateContent.includes('bootstrap') || 
                                templateContent.includes('col-md-') || 
                                templateContent.includes('card h-100');
    
    const needsIngredientImages = templateContent.includes('{{INGREDIENT_IMAGES}}');
    const needsTestimonialImages = templateContent.includes('{{TESTIMONIAL_IMAGES}}');
    const needsBenefitsList = templateContent.includes('{{BENEFITS_LIST}}');
    const needsFormulaText = templateContent.includes('{{FORMULA_TEXT}}');
    const needsBonusImages = templateContent.includes('{{BONUS_IMAGES}}');
    const needsGuaranteeImage = templateContent.includes('{{GUARANTEE_IMAGE}}');

    console.log(`🔍 Template analysis:`);
    console.log(`   Bootstrap: ${isBootstrapTemplate}`);
    console.log(`   Needs Ingredient Images: ${needsIngredientImages}`);
    console.log(`   Needs Testimonial Images: ${needsTestimonialImages}`);
    console.log(`   Needs Benefits List: ${needsBenefitsList}`);
    console.log(`   Needs Formula Text: ${needsFormulaText}`);
    console.log(`   Needs Bonus Images: ${needsBonusImages}`);
    console.log(`   Needs Guarantee Image: ${needsGuaranteeImage}`);

    /* =========================
       2️⃣ GERAR COPY AI ADAPTATIVA
    ========================= */
    let systemPrompt = `You are generating copy for a BOFU review page used primarily with Google Search traffic.

CRITICAL CONTEXT:
- This page is shown BEFORE purchase.
- The user already knows the product.
- The goal is to CONFIRM the decision and REDUCE hesitation.

Return ONLY valid JSON.`;

    // Adicionar instruções baseadas no template
    const additionalInstructions = [];

    if (needsBenefitsList) {
      if (isBootstrapTemplate) {
        additionalInstructions.push(`BENEFITS_LIST: Return exactly 6 benefits as comma-separated list. Each benefit should be 2-4 words maximum. Include relevant emojis where appropriate.`);
      } else {
        additionalInstructions.push(`BENEFITS_LIST: Return as comma-separated list of benefit statements (6-8 items).`);
      }
    }

    if (needsFormulaText) {
      if (templateContent.includes('<li>')) {
        additionalInstructions.push(`FORMULA_TEXT: Return as comma-separated list of key ingredients or formula aspects (4-6 items).`);
      } else {
        additionalInstructions.push(`FORMULA_TEXT: Return descriptive text about the formula structure (2-3 sentences).`);
      }
    }

    if (additionalInstructions.length > 0) {
      systemPrompt += `\n\nTEMPLATE-SPECIFIC INSTRUCTIONS:\n${additionalInstructions.join('\n')}`;
    }

    // Construir lista de keys necessárias
    const requiredKeys = [
      'HEADLINE',
      'SUBHEADLINE', 
      'INTRO',
      'WHY_IT_WORKS',
      needsFormulaText ? 'FORMULA_TEXT' : '',
      needsBenefitsList ? 'BENEFITS_LIST' : '',
      'SOCIAL_PROOF',
      'GUARANTEE'
    ].filter(Boolean);

    systemPrompt += `\n\nRequired keys (return ALL as strings):\n${requiredKeys.join('\n')}`;
    systemPrompt += `\n\nLanguage: ${language}`;

    const ai = await callDeepSeekWithRetry(
      systemPrompt,
      `Product URL: ${productUrl}`
    );

    console.log(`🤖 AI Response recebida`);

    /* =========================
       3️⃣ PROCESSAR BENEFITS_LIST BASEADO NO TEMPLATE
    ========================= */
    if (needsBenefitsList && ai.BENEFITS_LIST) {
      if (isBootstrapTemplate) {
        // Formatar para Bootstrap cards (6 itens)
        const benefits = String(ai.BENEFITS_LIST)
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
          .slice(0, 6);
        
        const emojis = ['🚀', '💪', '🎯', '🌟', '⚡', '✅', '🔋', '🧠', '💓', '🛡️'];
        const benefitEmojis = ['🚀', '💪', '🎯', '🌟', '⚡', '✅'];
        
        ai.BENEFITS_LIST = benefits.map((benefit, index) => {
          const parts = benefit.split(':');
          const title = parts[0]?.trim() || `Benefit ${index + 1}`;
          const description = parts[1]?.trim() || `Improves ${title.toLowerCase()} effectively.`;
          
          return `
<div class="col">
  <div class="card h-100 shadow-sm border-0 text-center p-3">
    <div class="card-icon mb-2 fs-2">${benefitEmojis[index] || '✅'}</div>
    <h5 class="card-title">${title}</h5>
    <p class="card-text">${description}</p>
  </div>
</div>`;
        }).join("\n");
      } else {
        // Formatar para lista simples com <li> e emojis
        const benefits = String(ai.BENEFITS_LIST)
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);
        
        const emojis = ['✅', '⭐', '⚡', '🎯', '🔝', '💯', '🔥', '💎'];
        
        ai.BENEFITS_LIST = benefits.map((item, index) => {
          return `<li>${emojis[index] || '✅'} ${item}</li>`;
        }).join("");
      }
    }

    /* =========================
       4️⃣ PROCESSAR FORMULA_TEXT BASEADO NO TEMPLATE
    ========================= */
    if (needsFormulaText && ai.FORMULA_TEXT) {
      if (templateContent.includes('<li>') && ai.FORMULA_TEXT.includes(',')) {
        // Formatar como <li> items com emojis
        const ingredients = String(ai.FORMULA_TEXT)
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
          .slice(0, 6);
        
        const ingredientEmojis = ['🌿', '🍃', '🌱', '💊', '🧪', '🔬'];
        
        ai.FORMULA_TEXT = ingredients.map((ingredient, index) => {
          return `<li>${ingredientEmojis[index] || '🌿'} ${ingredient}</li>`;
        }).join("\n");
      }
      // Se não for lista, mantém o texto como está
    }

    /* =========================
       5️⃣ EXTRAIR TODAS AS IMAGENS NECESSÁRIAS
    ========================= */
    console.log(`🖼️ Extraindo imagens necessárias...`);

    // Sempre extrair imagem principal
    const productImageRaw = await resolveHeroProductImage(productUrl);
    const productImage = await validateImageUrl(productImageRaw);

    // Extrair outras imagens apenas se o template precisar
    let ingredientImages = "";
    let testimonialImages = "";
    let bonusImages = "";
    let guaranteeImage = "";

    if (needsIngredientImages) {
      ingredientImages = await extractIngredientImages(productUrl);
      console.log(`🧪 Ingredient images: ${ingredientImages ? 'OK' : 'None'}`);
    }

    if (needsTestimonialImages) {
      testimonialImages = await extractTestimonialImages(productUrl);
      console.log(`🌟 Testimonial images: ${testimonialImages ? 'OK' : 'None'}`);
    }

    if (needsBonusImages) {
      bonusImages = await extractBonusImages(productUrl);
      console.log(`🎁 Bonus images: ${bonusImages ? 'OK' : 'None'}`);
    }

    if (needsGuaranteeImage) {
      guaranteeImage = await extractGuaranteeImage(productUrl);
      console.log(`💰 Guarantee image: ${guaranteeImage ? 'OK' : 'None'}`);
    }

    /* =========================
       6️⃣ APLICAR AO TEMPLATE (SISTEMA UNIVERSAL)
    ========================= */
    let html = templateContent;

    // Primeiro, aplicar textos AI
    let replacements = 0;
    const allPlaceholders = [
      'HEADLINE', 'SUBHEADLINE', 'INTRO', 'WHY_IT_WORKS', 
      'FORMULA_TEXT', 'BENEFITS_LIST', 'SOCIAL_PROOF', 'GUARANTEE'
    ];

    for (const key of allPlaceholders) {
      if (ai[key] && html.includes(`{{${key}}}`)) {
        html = html.replaceAll(`{{${key}}}`, ai[key]);
        replacements++;
        console.log(`   ✅ ${key}: ${ai[key].substring(0, 50)}...`);
      }
    }

    // Depois, aplicar imagens e links
    const imagePlaceholders = [
      { placeholder: '{{PRODUCT_IMAGE}}', value: productImage },
      { placeholder: '{{AFFILIATE_LINK}}', value: affiliateUrl },
      { placeholder: '{{INGREDIENT_IMAGES}}', value: ingredientImages },
      { placeholder: '{{TESTIMONIAL_IMAGES}}', value: testimonialImages },
      { placeholder: '{{BONUS_IMAGES}}', value: bonusImages },
      { placeholder: '{{GUARANTEE_IMAGE}}', value: guaranteeImage }
    ];

    for (const { placeholder, value } of imagePlaceholders) {
      if (html.includes(placeholder)) {
        html = html.replaceAll(placeholder, value || "");
        if (value) {
          replacements++;
          console.log(`   ✅ ${placeholder}: Inserido`);
        } else {
          console.log(`   ⚠️ ${placeholder}: Vazio (não encontrado)`);
        }
      }
    }

    // Aplicar placeholders globais
    html = applyGlobals(html);

    console.log(`🔄 ${replacements} placeholders substituídos`);
    console.log(`✅ Review gerado com sucesso (${html.length} chars)`);
    return html;

  } catch (error) {
    console.error(`🔥 Erro em generateBofuReview:`, error);
    throw error;
  }
}

/* =========================
   ROBUSTA (MANTIDO PARA COMPATIBILIDADE)
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
const productImageRaw = await resolveHeroProductImage(productUrl);
const productImage = await validateImageUrl(productImageRaw);

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
        "Para preservar la autenticidad, esta página não reproduce ni modifica opiniones individuales.",
      cta: "Ver testimonios en el sitio oficial",
    },
    fr: {
      title: "Ce que disent les clients",
      text:
        "Les témoignages réels de clients sont disponibles directamente sur le site oficial. " +
        "Afin de préserver l’authenticité, esta página ne reproduit ni ne modifie les avis individuels.",
      cta: "Voir les témoignages sur le site oficial",
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
    console.log("📥 Recebida requisição para /generate");
    
    if (req.headers["x-worker-token"] !== WORKER_TOKEN) {
      console.error("❌ Token inválido");
      return res.status(403).json({ error: "forbidden" });
    }

    const userEmail = req.headers["x-user-email"];
    if (!userEmail) {
      console.error("❌ Email não fornecido");
      return res.status(401).json({ error: "no user" });
    }

    console.log(`👤 Usuário: ${userEmail}`);

    const { data: access } = await supabaseAdmin
      .from("user_access")
      .select("access_until")
      .eq("email", userEmail)
      .single();

    if (!access || new Date(access.access_until) < new Date()) {
      console.error("❌ Acesso expirado ou não encontrado");
      return res.status(403).json({ error: "expired" });
    }

    const {
      templateId,
      productUrl,
      affiliateUrl,
      language = "en",
      legacyData = {},
      ...flatBody
    } = req.body;

    console.log(`🎯 Template ID: ${templateId}`);
    console.log(`🔗 Product URL: ${productUrl}`);
    console.log(`💰 Affiliate URL: ${affiliateUrl}`);
    console.log(`🌐 Language: ${language}`);

    const templatePath = findTemplate(templateId);
    if (!templatePath) {
      console.error(`❌ Template não encontrado: ${templateId}`);
      return res.status(404).json({ error: "no template" });
    }

    console.log(`📁 Template encontrado: ${templatePath}`);

    if (templateId.startsWith("review")) {
      console.log("🚀 Executando fluxo BOFU Review (Universal)");
      const html = await generateBofuReview({
        templatePath,
        affiliateUrl,
        productUrl,
        language,
      });
      return res.status(200).set("Content-Type", "text/html").send(html);
    }

    if (templateId.startsWith("robusta")) {
      console.log("🚀 Executando fluxo Robusta");
      const html = await generateRobusta({
        templatePath,
        affiliateUrl,
        productUrl,
      });
      return res.status(200).set("Content-Type", "text/html").send(html);
    }

    /* ===== LEGACY (INTOCADO) ===== */
    console.log("🔄 Executando fluxo Legacy");
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
    console.error("❌ Erro em /generate:", e.message);
    console.error(e.stack);
    return res.status(502).json({
      error: "generation_failed",
      message: e.message,
    });
  }
});

/* =========================
   TESTE PRODENTIM
========================= */
app.post("/test-prodentim", async (req, res) => {
  try {
    console.log("🧪 Iniciando teste ProDentim");
    
    const result = await debugProdentim("https://prodentim.com");
    
    // Testar todas as estratégias
    const strategies = {
      resolveHeroProductImage: await resolveHeroProductImage("https://prodentim.com"),
      extractBottleImage: await extractBottleImage("https://prodentim.com"),
      extractHeroImageWithPlaywright: await extractHeroImageWithPlaywright("https://prodentim.com")
    };
    
    res.json({
      debug: result,
      strategies,
      knownUrl: "https://prodentim101.com/statics/img/introducting_prodentim.png"
    });
    
  } catch (error) {
    console.error("❌ Erro no teste ProDentim:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WORKER rodando na porta ${PORT}`);
  console.log(`🔧 Modo DEBUG: ${process.env.DEBUG_IMAGES || 'false'}`);
  console.log(`🎯 Sistema: UNIVERSAL TEMPLATE ENGINE`);
});