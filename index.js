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
  let processed = html.replaceAll("{{CURRENT_YEAR}}", String(new Date().getFullYear()));
  
  // Placeholders padrão para templates universais
  const defaults = {
    "{{LANG}}": "en",
    "{{META_DESCRIPTION}}": "Independent product review and analysis",
    "{{PAGE_TITLE}}": "Product Review"
  };
  
  for (const [placeholder, value] of Object.entries(defaults)) {
    if (processed.includes(placeholder)) {
      processed = processed.replaceAll(placeholder, value);
    }
  }
  
  return processed;
}

/* =========================
   CLEAN HANDLEBARS SYNTAX (REMOVE {{#VAR}} e {{/VAR}})
========================= */
function cleanHandlebarsSyntax(html) {
  // Remove opening conditional tags like {{#PRODUCT_IMAGE}}
  let cleaned = html.replace(/\{\{#(\w+)\}\}/g, '');
  
  // Remove closing conditional tags like {{/PRODUCT_IMAGE}}
  cleaned = cleaned.replace(/\{\{\/(\w+)\}\}/g, '');
  
  return cleaned;
}

/* =========================
   URL NORMALIZER
========================= */
function normalizeUrl(u, base) {
  try {
    if (!u) return "";
    let s = String(u).trim();

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
   URL FIXER (CORRIGE DUPLO "//" E OUTROS PROBLEMAS)
========================= */
function fixImageUrl(url) {
  if (!url) return "";
  
  let fixed = String(url).trim();
  
  // CORREÇÃO CRÍTICA 1: Remove duplo "//" após o protocolo
  fixed = fixed.replace(/(https?:\/\/[^\/]+)\/\//g, '$1/');
  
  // CORREÇÃO CRÍTICA 2: Remove parâmetros desnecessários
  fixed = fixed.replace(/\?v=\d+$/, ''); // Remove ?v=123
  fixed = fixed.replace(/\?version=\d+$/, ''); // Remove ?version=123
  fixed = fixed.replace(/\?t=\d+$/, ''); // Remove ?t=123
  
  // CORREÇÃO CRÍTICA 3: Corrige caminhos com ../ repetidos
  fixed = fixed.replace(/(\.\.\/)+/g, '');
  
  return fixed;
}

/* =========================
   IMAGE VALIDATOR
========================= */
function validateImageUrl(url) {
  if (!url) return "";

  let u = String(url).trim();
  u = fixImageUrl(u); // Aplica correções
  
  if (!/^https?:\/\//i.test(u)) return "";
  if (u.startsWith("data:")) return "";
  if (/\.svg(\?|#|$)/i.test(u)) return "";

  return u;
}

/* =========================
   DEBUG PRODENTIM
========================= */
async function debugProdentim(productUrl) {
  console.log("🔍 DEBUG PRODENTIM INICIADO");
  
  try {
    const res = await fetch(productUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
    });
    
    console.log("📡 Status:", res.status);
    console.log("📡 Content-Type:", res.headers.get("content-type"));
    
    const html = await res.text();
    console.log("📄 HTML length:", html.length);
    
    const base = new URL(productUrl);
    const imgs = [...html.matchAll(/<img[^>]+>/gi)];
    console.log("🖼️ Total de imagens encontradas:", imgs.length);
    
    console.log("📋 Primeiras 10 imagens:");
    imgs.slice(0, 10).forEach((img, i) => {
      const tag = img[0];
      const src = tag.match(/src=["']([^"']+)["']/i);
      const dataSrc = tag.match(/data-src=["']([^"']+)["']/i);
      console.log(`  ${i + 1}. src: ${src ? src[1] : 'N/A'}`);
      console.log(`     data-src: ${dataSrc ? dataSrc[1] : 'N/A'}`);
    });
    
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

      let src = normalizeUrl(srcMatch[1], base);
      src = fixImageUrl(src); // Corrige a URL
      
      if (!src || src.startsWith("data:") || src.endsWith(".svg")) continue;

      const low = src.toLowerCase();
      
      // FILTRO MAIS RELAXADO: apenas bloqueia logos e icons óbvios
      const BAD_IMAGE_RE = /(logo|icon|favicon|spinner|loader|pixel|tracking|beacon)(?![a-z])/i;
      if (BAD_IMAGE_RE.test(low)) continue;

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
      const bad = /(logo|icon|favicon|spinner)(?![a-z])/i; // Apenas logos óbvios

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
        .sort((a, b) => b.area - b.area)[0]?.src || "";
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
    const normalize = (u) => {
      const normalized = normalizeUrl(u, base);
      return fixImageUrl(normalized); // Corrige a URL
    };

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

    /* EXCLUDE APENAS LOGOS ÓBVIOS */
    const EXCLUDE = [
      "favicon",
      "logo",
      "icon",
      "spinner",
      "loader",
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
   IMAGE RESOLVER — COM TODAS AS CORREÇÕES
========================= */
async function resolveHeroProductImage(productUrl) {
  console.log(`🔍 Resolvendo imagem para: ${productUrl}`);
  
  try {
    const res = await fetch(productUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 10000
    });
    
    if (!res.ok) {
      console.log(`❌ Fetch falhou: ${res.status}`);
      return "";
    }

    const html = await res.text();
    const base = new URL(productUrl);

    // 🔥 CORREÇÃO CRÍTICA: BAD_IMAGE_RE RELAXADO
    // Apenas bloqueia logos/ícones óbvios, não palavras comuns de e-commerce
    const BAD_IMAGE_RE = /(favicon|spinner|loader|pixel|tracking|beacon)(?![a-z])/i;
// Removemos "logo" e "icon" porque muitas imagens de produto podem conter essas palavras

    // 🔥 CORREÇÃO CRÍTICA: PADRÕES DE NOME DE ARQUIVO DE PRODUTO
    const PRODUCT_PATTERNS = [
      /tsl-main/i,
      /product.*\.(png|jpg|jpeg|webp|avif)/i,
      /main.*\.(png|jpg|jpeg|webp|avif)/i,
      /hero.*\.(png|jpg|jpeg|webp|avif)/i,
      /bottle.*\.(png|jpg|jpeg|webp|avif)/i,
      /supplement.*\.(png|jpg|jpeg|webp|avif)/i,
      /home.*product/i,
      /introducting/i,
      /featured.*image/i
    ];

    /* =========================
       SAFE NET — OG IMAGE
    ========================= */
    let ogImage = "";
    const og = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i);
    if (og) {
      const ogSrc = normalizeUrl(og[1], base);
      const fixedOgSrc = fixImageUrl(ogSrc);
      if (fixedOgSrc && !BAD_IMAGE_RE.test(fixedOgSrc)) {
        ogImage = fixedOgSrc;
        console.log(`🏷️ OG Image encontrada: ${ogSrc}`);
      }
    }

    const imgs = [...html.matchAll(/<img[^>]+>/gi)];
    let best = { src: "", score: 0 };
    let debug = [];

    for (const m of imgs) {
      const tag = m[0];

      // 🔥 CORREÇÃO: srcset agora pega a MAIOR imagem
      const srcsetMatch = tag.match(/srcset=["']([^"']+)["']/i);
      let srcCandidate = "";

      if (srcsetMatch) {
        srcCandidate = srcsetMatch[1]
          .split(",")
          .map(s => s.trim().split(" ")[0])
          .pop(); // pega a MAIOR (última do array)
      }

      // 🔥 CORREÇÃO: Múltiplas formas de pegar src
      const srcMatch =
        srcCandidate ||
        tag.match(/src=["']([^"']+)["']/i)?.[1] ||
        tag.match(/data-src=["']([^"']+)["']/i)?.[1] ||
        tag.match(/data-original=["']([^"']+)["']/i)?.[1] ||
        tag.match(/data-lazy=["']([^"']+)["']/i)?.[1];

      if (!srcMatch) continue;

      let src = normalizeUrl(srcMatch, base);
      src = fixImageUrl(src); // 🔥 CORREÇÃO CRÍTICA: Corrige URL
      
      if (!src) continue;

      const low = src.toLowerCase();

      /* ❌ FILTROS BÁSICOS */
      if (/^data:/i.test(low) || low.endsWith(".svg")) continue;

      /* ❌ BAD_IMAGE_RE RELAXADO */
      if (BAD_IMAGE_RE.test(low)) continue;

      let score = 0;

      /* ✅ PADRÕES DE PRODUTO - BÔNUS ALTO */
      PRODUCT_PATTERNS.forEach(pattern => {
        if (pattern.test(low)) {
          score += 60; // Bônus alto para padrões de produto
          console.log(`🎯 Padrão de produto encontrado: ${pattern} (+60)`);
        }
      });

      /* ✅ SEMÂNTICA FORTE (PRODUTO) */
      if (/(product|bottle|supplement|capsule|jar|pack|bundle|introducting)/i.test(low)) {
        score += 40;
      }

      /* ✅ TAMANHO */
      const w = tag.match(/width=["']?(\d+)/i);
      const h = tag.match(/height=["']?(\d+)/i);

      if (w && h) {
        const area = Number(w[1]) * Number(h[1]);
        if (area > 40000) score += 35;
        else if (area > 20000) score += 20;
      } else {
        score += 10;
      }

      /* ✅ POSIÇÃO NO HTML */
      const position = html.indexOf(m[0]);
      if (position > -1 && position < html.length * 0.3) {
        score += 30;
      }

      /* ✅ ALT TEXT (se tiver descrição) */
      const alt = tag.match(/alt=["']([^"']+)["']/i);
      if (alt && alt[1].length > 3) {
        score += 15;
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
      /(?:https?:\/\/|\/)[^"'()\s]*?\.(png|jpe?g|webp|avif)(\?[^"'()\s]*)?/gi
    )]
      .map(m => {
        let url = normalizeUrl(m[0], base);
        return fixImageUrl(url); // 🔥 CORREÇÃO: Corrige URL
      })
      .filter(u =>
        u &&
        !BAD_IMAGE_RE.test(u) &&
        !/\.svg(\?|#|$)/i.test(u)
      );

    // 🔥 PRIORIDADE PARA PADRÕES DE PRODUTO
    const assetPreferred = 
      assetCandidates.find(u => PRODUCT_PATTERNS.some(p => p.test(u))) ||
      assetCandidates.find(u => /(product|bottle|supplement|main|hero)/i.test(u)) ||
      assetCandidates[0];

    /* 🔍 DEBUG */
    if (process.env.DEBUG_IMAGES === "true") {
      console.log("🏆 IMAGE RANKING (top 5):", debug.sort((a, b) => b.score - a.score).slice(0, 5));
      console.log("🔍 ASSET CANDIDATES (top 3):", assetCandidates.slice(0, 3));
      console.log(`📊 Melhor score: ${best.score}, Asset preferred: ${assetPreferred}`);
    }

    /* =========================
       ORDEM FINAL DE DECISÃO - CORRIGIDA
    ========================= */
    
    // 1️⃣ RANKING COM THRESHOLD BAIXO
    if (best.src && best.score > 5) {
      console.log(`✅ Imagem selecionada (ranking): ${best.src} (score: ${best.score})`);
      return best.src;
    }

    // 2️⃣ ASSETS SOLTOS COM PADRÃO DE PRODUTO
    if (assetPreferred) {
      console.log(`✅ Imagem selecionada (assets): ${assetPreferred}`);
      return assetPreferred;
    }

    // 3️⃣ OG IMAGE
    if (ogImage) {
      console.log(`✅ Imagem selecionada (OG): ${ogImage}`);
      return ogImage;
    }

    // 4️⃣ MELHOR DO RANKING (mesmo com score baixo)
    if (best.src) {
      console.log(`✅ Imagem selecionada (fallback): ${best.src}`);
      return best.src;
    }

    // 5️⃣ PLAYWRIGHT (último recurso)
    console.log(`🔄 Tentando extração via Playwright...`);
    const pw = await extractHeroImageWithPlaywright(productUrl);
    if (pw) {
      console.log(`✅ Imagem selecionada (playwright): ${pw}`);
      return fixImageUrl(pw);
    }

    console.log(`❌ Nenhuma imagem encontrada`);
    return "";
    
  } catch (error) {
    console.error(`🔥 Erro no resolveHeroProductImage: ${error.message}`);
    return "";
  }
}

/* =========================
   UPLOAD TO R2 (LEGACY)
========================= */
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
    
    const normalize = (u) => {
      const normalized = normalizeUrl(u, base);
      return fixImageUrl(normalized);
    };

    // 🔥 FILTRO RELAXADO
    const BAD_IMAGE_RE = /(logo|icon|favicon|spinner)(?![a-z])/i;
    
    const INCLUDE = ["ingredient", "formula", "blend", "extract", "component", "herb", "plant", "capsule"];

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
    const out = [];

    for (const m of imgs) {
      if (out.length >= 4) break;
      
      let src = normalize(m[1]);
      if (!src || src.startsWith("data:") || src.endsWith(".svg")) continue;
      
      const low = src.toLowerCase();
      
      // 🔥 FILTRO RELAXADO
      if (BAD_IMAGE_RE.test(low)) continue;
      
      // Verificar se parece ingrediente
      const imgTag = m[0].toLowerCase();
      const isIngredient = INCLUDE.some(word => 
        low.includes(word) || imgTag.includes(word)
      );

      if (isIngredient) {
        out.push(`<img src="${src}" alt="Natural ingredient" class="ingredient-img" loading="lazy">`);
      }
    }

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
    
    const normalize = (u) => {
      const normalized = normalizeUrl(u, base);
      return fixImageUrl(normalized);
    };

    // 🔥 FILTRO RELAXADO
    const BAD_IMAGE_RE = /(logo|icon|favicon|spinner)(?![a-z])/i;

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

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];
    const out = [];

    for (const m of imgs) {
      if (out.length >= 3) break;

      let src = normalize(m[1]);
      if (!src) continue;

      const low = src.toLowerCase();

      if (low.startsWith("data:")) continue;
      if (low.endsWith(".svg")) continue;
      
      // 🔥 FILTRO RELAXADO
      if (BAD_IMAGE_RE.test(low)) continue;

      // Verificar conteúdo
      const hasContent = CONTENT_KEYWORDS.some((w) => low.includes(w));
      if (!hasContent) continue;

      out.push(`<img src="${src}" alt="Bonus material" class="bonus-img" loading="lazy">`);
    }

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
    
    const normalize = (u) => {
      const normalized = normalizeUrl(u, base);
      return fixImageUrl(normalized);
    };

    // 🔥 FILTRO RELAXADO
    const BAD_IMAGE_RE = /(logo|icon|favicon|spinner)(?![a-z])/i;
    
    const INCLUDE = ["guarantee", "moneyback", "money-back", "refund", "risk", "badge", "seal", "certif", "warranty"];

    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)];

    for (const m of imgs) {
      let src = normalize(m[1]);
      const low = src.toLowerCase();
      
      if (!src || low.startsWith("data:") || low.endsWith(".svg")) continue;
      
      // 🔥 FILTRO RELAXADO
      if (BAD_IMAGE_RE.test(low)) continue;
      
      // Verificar se parece garantia
      const isGuarantee = INCLUDE.some((w) => low.includes(w));
      if (!isGuarantee) continue;

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
    
    const normalize = (u) => {
      const normalized = normalizeUrl(u, base);
      return fixImageUrl(normalized);
    };

    // 🔥 FILTRO RELAXADO
    const BAD_IMAGE_RE = /(logo|icon|favicon|spinner)(?![a-z])/i;

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
      if (out.length >= 3) break;
      
      let src = normalize(m[1]);
      if (!src || src.startsWith("data:")) continue;
      
      const low = src.toLowerCase();
      
      // 🔥 FILTRO RELAXADO
      if (BAD_IMAGE_RE.test(low)) continue;
      
      // Verificar padrões
      const imgTag = m[0].toLowerCase();
      const isTestimonial = patterns.some(pattern => 
        pattern.test(low) || pattern.test(imgTag)
      );

      if (isTestimonial) {
        out.push(`
<div class="testimonial-item">
  <img src="${src}" alt="Customer testimonial" class="testimonial-img" loading="lazy">
  <p class="testimonial-text">"Positive feedback from satisfied user."</p>
  <p class="testimonial-author">- Happy Customer</p>
</div>`);
      }
    }

    // Fallback genérico se não encontrar
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
   DEEPSEEK API
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

      if (!r.ok) {
        throw new Error(`DeepSeek API error: ${r.status}`);
      }

      const data = await r.json();
      const raw = data.choices[0].message.content;
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found in response");

      return JSON.parse(match[0]);
    } catch (e) {
      console.error(`❌ Tentativa ${i} falhou:`, e.message);
      if (i === attempts) throw e;
      await new Promise(resolve => setTimeout(resolve, 1000 * i));
    }
  }
}

/* =========================
   BOFU REVIEW
========================= */
async function generateBofuReview({
  templatePath,
  affiliateUrl,
  productUrl,
  language,
}) {
  console.log(`🎯 generateBofuReview chamado para: ${productUrl}`);
  console.log(`📁 Template: ${templatePath}`);

  try {
    // 1. CARREGAR TEMPLATE
    let html = fs.readFileSync(templatePath, "utf8");
    console.log(`📄 Template carregado (${html.length} chars)`);

    // 2. DETECTAR TIPO DE TEMPLATE
    const isUniversalTemplate = html.includes('{{LANG}}') || html.includes('{{META_DESCRIPTION}}');
    const isBootstrapTemplate = html.includes('card h-100') || html.includes('col-md-');
    const isSimpleTemplate = !isUniversalTemplate && !isBootstrapTemplate;
    
    console.log(`🔍 Template detectado:`);
    console.log(`   Universal: ${isUniversalTemplate}`);
    console.log(`   Bootstrap: ${isBootstrapTemplate}`);
    console.log(`   Simple: ${isSimpleTemplate}`);

    // 3. DETECTAR PLACEHOLDERS NECESSÁRIOS
    const needsIngredientImages = html.includes('{{INGREDIENT_IMAGES}}');
    const needsTestimonialImages = html.includes('{{TESTIMONIAL_IMAGES}}');
    const needsBonusImages = html.includes('{{BONUS_IMAGES}}');
    const needsGuaranteeImage = html.includes('{{GUARANTEE_IMAGE}}');

    // 4. GERAR CONTEÚDO AI
    let systemPrompt = `You are generating copy for a BOFU review page used primarily with Google Search traffic.

CRITICAL CONTEXT:
- This page is shown BEFORE purchase.
- The user already knows the product.
- The goal is to CONFIRM the decision and REDUCE hesitation.

Return ONLY valid JSON.`;

    // Adicionar instruções baseadas no template
    const additionalInstructions = [];

    if (isBootstrapTemplate) {
      additionalInstructions.push(`BENEFITS_LIST: Return exactly 6 benefits as comma-separated list. Each benefit should be 2-4 words maximum. Include relevant emojis where appropriate.`);
    } else {
      additionalInstructions.push(`BENEFITS_LIST: Return as comma-separated list of benefit statements (6-8 items).`);
    }

    if (additionalInstructions.length > 0) {
      systemPrompt += `\n\nTEMPLATE-SPECIFIC INSTRUCTIONS:\n${additionalInstructions.join('\n')}`;
    }

    const requiredKeys = [
      'HEADLINE',
      'SUBHEADLINE', 
      'INTRO',
      'WHY_IT_WORKS',
      'FORMULA_TEXT',
      'BENEFITS_LIST',
      'SOCIAL_PROOF',
      'GUARANTEE'
    ].filter(Boolean);

    systemPrompt += `\n\nRequired keys (return ALL as strings):\n${requiredKeys.join('\n')}`;
    systemPrompt += `\n\nLanguage: ${language}`;

    const ai = await callDeepSeekWithRetry(systemPrompt, `Product URL: ${productUrl}`);
    console.log(`🤖 AI Response recebida`);

    // 5. FORMATAR BENEFITS_LIST BASEADO NO TEMPLATE
    if (ai.BENEFITS_LIST) {
      const benefits = String(ai.BENEFITS_LIST)
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

      if (isBootstrapTemplate) {
        // Formato Bootstrap Cards (6 itens)
        const emojis = ['🚀', '💪', '🎯', '🌟', '⚡', '✅', '🔋', '🧠', '💓', '🛡️'];
        
        ai.BENEFITS_LIST = benefits.slice(0, 6).map((benefit, index) => {
          const parts = benefit.split(':');
          const title = parts[0]?.trim() || `Benefit ${index + 1}`;
          const description = parts[1]?.trim() || `Improves ${title.toLowerCase()} effectively.`;
          
          return `
<div class="col">
  <div class="card h-100 shadow-sm border-0 text-center p-3">
    <div class="card-icon mb-2 fs-2">${emojis[index] || '✅'}</div>
    <h5 class="card-title">${title}</h5>
    <p class="card-text">${description}</p>
  </div>
</div>`;
        }).join("\n");
      } else if (isSimpleTemplate) {
        // Formato simples (lista <li>)
        ai.BENEFITS_LIST = benefits.map(item => `<li>${item}</li>`).join("");
      } else {
        // Formato universal (default)
        ai.BENEFITS_LIST = benefits.map(item => `<li>✅ ${item}</li>`).join("");
      }
    }

    // 6. EXTRAIR IMAGEM DO PRODUTO (COM ALGORITMO CORRIGIDO + FALLBACKS)
console.log(`🖼️ Extraindo imagem do produto...`);
let productImage = await resolveHeroProductImage(productUrl);

// 🔥 PATCH CRÍTICO: Se o algoritmo principal falhar, usar fallback inteligente
if (!productImage) {
  console.log(`🔄 Nenhuma imagem pelo algoritmo principal, tentando fallbacks...`);
  
  // Fallback 1: Tentar extração simplificada
  try {
    const response = await fetch(productUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000
    });
    
    if (response.ok) {
      const html = await response.text();
      const base = new URL(productUrl);
      
      // Procurar por padrões específicos
      const patterns = [
        /tsl-main\.png/i,
        /product.*\.(png|jpg|jpeg|webp)/i,
        /main.*\.(png|jpg|jpeg|webp)/i,
        /hero.*\.(png|jpg|jpeg|webp)/i,
        /bottle.*\.(png|jpg|jpeg|webp)/i
      ];
      
      // Extrair todas as URLs de imagem
      const imageUrls = [...html.matchAll(/(https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp|avif))/gi)]
        .map(m => {
          let url = m[0];
          // Corrigir duplo "//"
          url = url.replace(/(https?:\/\/[^\/]+)\/\//g, '$1/');
          return url;
        })
        .filter(url => {
          const low = url.toLowerCase();
          // Filtro MÍNIMO - apenas bloquear SVG e data URLs
          return !low.startsWith('data:') && !low.endsWith('.svg');
        });
      
      console.log(`📊 Encontradas ${imageUrls.length} URLs de imagem no HTML`);
      
      // Priorizar URLs que parecem ser do produto
      for (const pattern of patterns) {
        const match = imageUrls.find(url => pattern.test(url));
        if (match) {
          productImage = match;
          console.log(`✅ Imagem encontrada por padrão: ${productImage}`);
          break;
        }
      }
      
      // Se ainda não encontrou, pegar a primeira imagem decente
      if (!productImage && imageUrls.length > 0) {
        // Filtrar logos óbvios
        const goodImages = imageUrls.filter(url => {
          const low = url.toLowerCase();
          return !/(logo|icon|favicon|spinner|loader)/i.test(low);
        });
        
        if (goodImages.length > 0) {
          productImage = goodImages[0];
          console.log(`✅ Usando primeira imagem decente: ${productImage}`);
        }
      }
    }
  } catch (error) {
    console.log(`❌ Fallback também falhou: ${error.message}`);
  }
}

// 🔥 FALLBACK DE EMERGÊNCIA PARA SITES CONHECIDOS
if (!productImage) {
  console.log(`🚨 Todos os métodos falharam, usando fallback de emergência`);
  
  const lowerUrl = productUrl.toLowerCase();
  
  if (lowerUrl.includes('primebiome') || lowerUrl.includes('getprimebiome')) {
    productImage = "https://getprimebiome.com/statics/img/tsl-main.png";
    console.log(`🎯 Usando URL conhecida para PrimeBiome`);
  }
  // Você pode adicionar mais sites conhecidos aqui se necessário
}

// SÓ DEPOIS mostrar se não encontrou
if (!productImage) {
  console.log(`⚠️ Nenhuma imagem encontrada após todas as tentativas`);
  // Deixa vazio - template lida
}

    // 7. EXTRAIR OUTRAS IMAGENS CONDICIONALMENTE
    console.log(`🖼️ Extraindo outras imagens...`);
    
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

    // 8. APLICAR SUBSTITUIÇÕES
    let replacements = 0;
    
    // Primeiro: textos da AI
    for (const [key, value] of Object.entries(ai)) {
      const placeholder = `{{${key}}}`;
      if (html.includes(placeholder)) {
        html = html.replaceAll(placeholder, value || "");
        replacements++;
        console.log(`   ✅ ${key}: ${value ? value.substring(0, 50) + '...' : '(vazio)'}`);
      }
    }
    
    // Segundo: links e imagens
    const placeholdersToReplace = [
      { placeholder: '{{AFFILIATE_LINK}}', value: affiliateUrl },
      { placeholder: '{{PRODUCT_IMAGE}}', value: productImage },
      { placeholder: '{{INGREDIENT_IMAGES}}', value: ingredientImages },
      { placeholder: '{{TESTIMONIAL_IMAGES}}', value: testimonialImages },
      { placeholder: '{{BONUS_IMAGES}}', value: bonusImages },
      { placeholder: '{{GUARANTEE_IMAGE}}', value: guaranteeImage }
    ];
    
    for (const { placeholder, value } of placeholdersToReplace) {
      if (html.includes(placeholder)) {
        html = html.replaceAll(placeholder, value || "");
        replacements++;
        if (value) {
          console.log(`   ✅ ${placeholder}: Inserido`);
        } else {
          console.log(`   ⚠️ ${placeholder}: Vazio (não encontrado)`);
        }
      }
    }
    
    // 9. REMOVER SINTAXE HANDLEBARS ({{#VAR}} e {{/VAR}})
    html = cleanHandlebarsSyntax(html);
    
    // 10. APLICAR PLACEHOLDERS GLOBAIS
    html = applyGlobals(html);
    
    // 11. LIMPAR SEÇÕES VAZIAS
    // Remove imagens com src vazio
    html = html.replace(/<img[^>]*src=["']{2}[^>]*>/g, '');
    // Remove divs vazias
    html = html.replace(/<div[^>]*>\s*<\/div>/g, '');
    // Remove seções completas se não tiverem conteúdo além do título
    html = html.replace(/<section[^>]*>\s*<h2[^>]*>.*?<\/h2>\s*<\/section>/g, '');
    
    console.log(`🔄 ${replacements} placeholders substituídos`);
    console.log(`✅ Review gerado (${html.length} chars)`);
    
    return html;

  } catch (error) {
    console.error(`🔥 Erro em generateBofuReview:`, error);
    // Retornar template básico em caso de erro
    return `<html><body><h1>Error generating page</h1><p>${error.message}</p><a href="${affiliateUrl}">Visit Official Site</a></body></html>`;
  }
}

/* =========================
   ROBUSTA (MANTIDO PARA COMPATIBILIDADE)
========================= */
async function generateRobusta({
  templatePath,
  affiliateUrl,
  productUrl,
  language = "en",
}) {
  console.log(`🎯 generateRobusta para: ${productUrl}`);

  const ai = await callDeepSeekWithRetry(
    `Return ONLY valid JSON.

This page is shown immediately BEFORE the user clicks to the official website.
The user has already read a full review.
Your role is NOT to educate, but to CONFIRM the decision and REDUCE risk.

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

Output ONLY valid JSON.`,
    `Product URL: ${productUrl}`
  );

  // Extrair imagens
  const productImage = await resolveHeroProductImage(productUrl);
  const ingredientImages = await extractIngredientImages(productUrl);
  const bonusImages = await extractBonusImages(productUrl);
  const guaranteeImage = await extractGuaranteeImage(productUrl);

  // Template fallback
  const testimonialFallback = {
    en: { title: "What customers are saying", text: "Real customer testimonials are available directly on the official website.", cta: "View real testimonials" },
    pt: { title: "O que clientes dizem", text: "Depoimentos reais estão disponíveis no site oficial.", cta: "Ver depoimentos" },
  };

  // Carregar template
  let html = fs.readFileSync(templatePath, "utf8");

  // Aplicar AI
  for (const [k, v] of Object.entries(ai)) {
    html = html.replaceAll(`{{${k}}}`, v || "");
  }

  // Aplicar imagens e links
  html = html
    .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl)
    .replaceAll("{{PRODUCT_IMAGE}}", productImage || "")
    .replaceAll("{{INGREDIENT_IMAGES}}", ingredientImages || "")
    .replaceAll("{{BONUS_IMAGES}}", bonusImages || "")
    .replaceAll("{{GUARANTEE_IMAGE}}", guaranteeImage || "");

  // Testimonial fallback
  const t = testimonialFallback[language] || testimonialFallback.en;
  html = html
    .replaceAll("{{TESTIMONIAL_TITLE}}", ai.TESTIMONIAL_TITLE || t.title)
    .replaceAll("{{TESTIMONIAL_NOTICE_TEXT}}", ai.TESTIMONIAL_NOTICE_TEXT || t.text)
    .replaceAll("{{TESTIMONIAL_CTA_TEXT}}", ai.TESTIMONIAL_CTA_TEXT || t.cta);

  // Globais
  html = applyGlobals(html);

  return html;
}

/* =========================
   GENERATE (ROTA PRINCIPAL)
========================= */
app.post("/generate", async (req, res) => {
  try {
    console.log("📥 Recebida requisição para /generate");
    
    // Autenticação
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

    // Verificar acesso
    const { data: access } = await supabaseAdmin
      .from("user_access")
      .select("access_until")
      .eq("email", userEmail)
      .single();

    if (!access || new Date(access.access_until) < new Date()) {
      console.error("❌ Acesso expirado");
      return res.status(403).json({ error: "expired" });
    }

    // Dados da requisição
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

    // Encontrar template
    const templatePath = findTemplate(templateId);
    if (!templatePath) {
      console.error(`❌ Template não encontrado: ${templateId}`);
      return res.status(404).json({ error: "no template" });
    }

    console.log(`📁 Template encontrado: ${templatePath}`);

    // Roteamento por tipo de template
    if (templateId.startsWith("review")) {
      console.log("🚀 Executando fluxo BOFU Review");
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
        language,
      });
      return res.status(200).set("Content-Type", "text/html").send(html);
    }

    /* ===== LEGACY (MODO ANTIGO) ===== */
    console.log("🔄 Executando fluxo Legacy");
    const finalLegacyData = { ...legacyData, ...flatBody };
    delete finalLegacyData.templateId;
    delete finalLegacyData.productUrl;
    delete finalLegacyData.affiliateUrl;
    delete finalLegacyData.language;

    // Screenshots
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

    // Processar template legacy
    let html = fs.readFileSync(templatePath, "utf8")
      .replaceAll("{{DESKTOP_PRINT}}", du)
      .replaceAll("{{MOBILE_PRINT}}", mu)
      .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl);

    for (const [k, v] of Object.entries(finalLegacyData)) {
      html = html.replaceAll(`{{${k}}}`, String(v));
    }

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
   TESTE DE IMAGEM DO PRODENTIM
========================= */
app.post("/test-prodentim-image", async (req, res) => {
  try {
    const productUrl = "https://prodentim.com";
    
    console.log(`🧪 Testando extração de imagem do Prodentim`);
    
    // Testar todas as estratégias
    const results = {
      mainMethod: await resolveHeroProductImage(productUrl),
      ogImage: await extractOGImage(productUrl),
      assets: await extractAssets(productUrl),
      bottle: await extractBottleImage(productUrl),
      playwright: await extractHeroImageWithPlaywright(productUrl)
    };
    
    // Verificar URL conhecida
    const knownUrl = "https://prodentim101.com/statics/img/introducting_prodentim.png";
    let knownUrlStatus = "unknown";
    
    try {
      const test = await fetch(knownUrl, { method: 'HEAD' });
      knownUrlStatus = test.ok ? "accessible" : "not accessible";
    } catch {
      knownUrlStatus = "error";
    }
    
    res.json({
      success: true,
      productUrl,
      results,
      knownUrl,
      knownUrlStatus,
      recommendations: results.mainMethod ? 
        "✅ Sistema funcionando corretamente" : 
        "❌ Problema na extração de imagens"
    });
    
  } catch (error) {
    console.error("❌ Erro no teste:", error);
    res.status(500).json({ error: error.message });
  }
});

// Funções auxiliares para o teste
async function extractOGImage(productUrl) {
  try {
    const res = await fetch(productUrl);
    const html = await res.text();
    const base = new URL(productUrl);
    
    const og = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i);
    if (og) {
      return normalizeUrl(og[1], base);
    }
    return "";
  } catch {
    return "";
  }
}

async function extractAssets(productUrl) {
  try {
    const res = await fetch(productUrl);
    const html = await res.text();
    const base = new URL(productUrl);
    
    const matches = [...html.matchAll(
      /(?:https?:\/\/|\/)[^"'()\s]+?\.(png|jpe?g|webp|avif)(\?[^"'()\s]*)?/gi
    )];
    
    return matches.map(m => normalizeUrl(m[0], base)).slice(0, 5);
  } catch {
    return [];
  }
}
/* =========================
   DEBUG PRIMEBIOME ESPECÍFICO
========================= */
app.post("/debug-primebiome", async (req, res) => {
  try {
    const productUrl = "https://getprimebiome.com/";
    console.log(`🔍 DEBUG ESPECÍFICO PARA PRIMEBIOME: ${productUrl}`);
    
    // 1. Fazer fetch da página
    const response = await fetch(productUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 10000
    });
    
    console.log(`📡 Status: ${response.status}`);
    
    const html = await response.text();
    const base = new URL(productUrl);
    
    // 2. Procurar a imagem específica que sabemos que existe
    const targetPatterns = [
      "tsl-main.png",
      "product-home.png", 
      "main-product.png",
      "hero.png",
      "bottle.png"
    ];
    
    console.log(`🔎 Procurando padrões específicos:`);
    
    targetPatterns.forEach(pattern => {
      const index = html.indexOf(pattern);
      if (index > -1) {
        // Pegar contexto ao redor
        const start = Math.max(0, index - 100);
        const end = Math.min(html.length, index + 100);
        const context = html.substring(start, end);
        console.log(`✅ ENCONTRADO "${pattern}":`);
        console.log(`   Contexto: ${context}`);
        
        // Tentar extrair a URL completa
        const urlMatch = context.match(/(https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp|avif))/i);
        if (urlMatch) {
          console.log(`   URL completa: ${urlMatch[1]}`);
        }
      } else {
        console.log(`❌ NÃO ENCONTRADO: "${pattern}"`);
      }
    });
    
    // 3. Testar a função atual
    console.log(`\n🧪 Testando resolveHeroProductImage():`);
    const result = await resolveHeroProductImage(productUrl);
    console.log(`   Resultado: ${result || "(vazio)"}`);
    
    // 4. Testar extração de OG Image
    const og = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i);
    console.log(`\n🏷️ OG Image: ${og ? og[1] : "Não encontrada"}`);
    
    // 5. Contar imagens totais
    const imgTags = [...html.matchAll(/<img[^>]+>/gi)];
    console.log(`\n🖼️ Total de tags <img>: ${imgTags.length}`);
    
    // Mostrar as primeiras 5
    console.log(`📋 Primeiras 5 imagens:`);
    imgTags.slice(0, 5).forEach((img, i) => {
      const tag = img[0];
      const srcMatch = tag.match(/src=["']([^"']+)["']/i);
      const dataSrc = tag.match(/data-src=["']([^"']+)["']/i);
      console.log(`   ${i+1}. src: ${srcMatch ? srcMatch[1].substring(0, 80) : 'N/A'}`);
      console.log(`      data-src: ${dataSrc ? dataSrc[1].substring(0, 80) : 'N/A'}`);
    });
    
    res.json({
      success: true,
      url: productUrl,
      imageFound: !!result,
      imageUrl: result,
      totalImages: imgTags.length,
      hasOGImage: !!og,
      ogImage: og ? og[1] : null
    });
    
  } catch (error) {
    console.error(`🔥 Erro no debug: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "Page Generator Worker"
  });
});

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WORKER rodando na porta ${PORT}`);
  console.log(`🔧 Sistema: BOFU Review Generator`);
  console.log(`🎯 Templates suportados: review-*, robusta-*, legacy`);
});