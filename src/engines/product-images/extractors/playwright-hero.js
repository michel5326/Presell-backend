const { chromium } = require('playwright');
const { normalizeImageUrl } = require('../utils/normalize-url');
const { shouldDiscardImageUrl } = require('../utils/filter-image-url');

function scoreCandidate(c) {
  // score base por área
  let score = c.area || 0;

  const s = (c.src || '').toLowerCase();
  const t = (c.text || '').toLowerCase();

  // bônus por “cara de produto”
  const good = /(product|bottle|jar|capsule|supplement|pack|bundle|container)/i;
  if (good.test(s) || good.test(t)) score += 15000;

  // penaliza “cara de peça auxiliar”
  const bad = /(bonus|guarantee|badge|seal|review|stars|rating|testimony|ebook|pdf|manual)/i;
  if (bad.test(s) || bad.test(t)) score -= 20000;

  // penaliza banners muito “wide” (muito comum em hero-vídeo)
  if (c.w && c.h) {
    const ratio = c.w / c.h;
    if (ratio > 2.6) score -= 12000;   // muito panorâmico
    if (ratio < 0.35) score -= 6000;   // muito estreito
  }

  // bônus por estar “centralizado” na dobra
  if (typeof c.cx === 'number' && typeof c.cy === 'number') {
    // quanto mais perto do centro, melhor
    const dist = Math.sqrt(c.cx * c.cx + c.cy * c.cy);
    score += Math.max(0, 8000 - dist * 10);
  }

  return score;
}

/**
 * Extrai a melhor imagem “de produto” do primeiro fold renderizado
 * - ignora vídeo/iframe
 * - considera <img> e background-image
 * - retorna URL normalizada (string) ou ''
 */
async function extractHeroProductImageWithPlaywright(productUrl) {
  if (!productUrl) return '';

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // dá um tempinho pra montar hero sem ficar caro
    await page.waitForTimeout(900);

    const rawBest = await page.evaluate(() => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      const isVisible = (el) => {
        const r = el.getBoundingClientRect();
        if (r.width <= 2 || r.height <= 2) return false;
        if (r.bottom < 0 || r.top > vh) return false; // fora do fold
        const style = window.getComputedStyle(el);
        if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return false;
        }
        return true;
      };

      const isInsideVideoLike = (el) => {
        // se está dentro de <video>, <iframe> ou container com “video”
        let cur = el;
        while (cur && cur !== document.body) {
          const tag = (cur.tagName || '').toLowerCase();
          if (tag === 'video' || tag === 'iframe') return true;

          const cls = (cur.className || '').toString().toLowerCase();
          const id = (cur.id || '').toString().toLowerCase();
          if (cls.includes('video') || id.includes('video') || cls.includes('player') || id.includes('player')) {
            return true;
          }
          cur = cur.parentElement;
        }
        return false;
      };

      const candidates = [];

      // 1) <img>
      const imgs = Array.from(document.images || []);
      for (const img of imgs) {
        if (!isVisible(img)) continue;
        if (isInsideVideoLike(img)) continue;

        const r = img.getBoundingClientRect();
        const src = img.currentSrc || img.src || '';
        const alt = img.getAttribute('alt') || '';
        candidates.push({
          src,
          area: r.width * r.height,
          w: r.width,
          h: r.height,
          text: alt,
          // centro normalizado (0,0 no centro do viewport)
          cx: Math.abs((r.left + r.width / 2) - vw / 2),
          cy: Math.abs((r.top + r.height / 2) - vh / 2),
        });
      }

      // 2) background-image (primeira dobra) — limitado para não ficar pesado
      const bgEls = Array.from(document.querySelectorAll('section,div,figure,a,span'))
        .slice(0, 900);

      for (const el of bgEls) {
        if (!isVisible(el)) continue;
        if (isInsideVideoLike(el)) continue;

        const style = window.getComputedStyle(el);
        const bg = style && style.backgroundImage ? style.backgroundImage : '';
        if (!bg || bg === 'none') continue;

        // pega a primeira url(...) do background-image
        const m = bg.match(/url\(["']?([^"')]+)["']?\)/i);
        if (!m || !m[1]) continue;

        const r = el.getBoundingClientRect();
        candidates.push({
          src: m[1],
          area: r.width * r.height,
          w: r.width,
          h: r.height,
          text: (el.getAttribute('aria-label') || '') + ' ' + (el.className || ''),
          cx: Math.abs((r.left + r.width / 2) - vw / 2),
          cy: Math.abs((r.top + r.height / 2) - vh / 2),
        });
      }

      return candidates;
    });

    // normaliza + filtra + score no Node (mais fácil)
    const scored = [];
    for (const c of rawBest || []) {
      const normalized = normalizeImageUrl(c.src, productUrl);
      if (!normalized) continue;
      if (shouldDiscardImageUrl(normalized)) continue;
      scored.push({
        ...c,
        src: normalized,
        score: scoreCandidate({ ...c, src: normalized }),
      });
    }

    if (!scored.length) return '';

    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.src || '';
  } catch {
    return '';
  } finally {
    if (browser) {
      try { await browser.close(); } catch {}
    }
  }
}

module.exports = {
  extractHeroProductImageWithPlaywright,
};
