const { withPage } = require('../../../services/browser/playwright.service');

function looksBadUrl(u) {
  if (!u || typeof u !== 'string') return true;
  const lower = u.toLowerCase();

  if (lower.startsWith('data:')) return true;
  if (lower.endsWith('.svg')) return true;

  // trackers / pixels
  if (lower.includes('pixel') || lower.includes('1x1') || lower.includes('spacer')) return true;

  // identidade / ui / selos / pagamentos / bônus
  const bad = [
    'logo','brand','icon','favicon','sprite','badge','seal','trust','rating','star','review',
    'guarantee','money-back','refund','shipping','delivery','payment','secure','visa',
    'mastercard','paypal','bonus','ebook',
  ];
  if (bad.some((k) => lower.includes(k))) return true;

  return false;
}

// ✅ agora recebe attempt
async function extractHeroScreenshotDataUrl(productUrl, attempt = 1) {
  if (!productUrl) return '';

  const safeAttempt = Number.isFinite(Number(attempt)) ? Math.max(1, Number(attempt)) : 1;

  try {
    return await withPage(async (page) => {
      await page.goto(productUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      await page.waitForTimeout(1200);

      const marked = await page.evaluate(({ attempt }) => {
        const VH = window.innerHeight || 800;

        const getUrlFromBg = (el) => {
          try {
            const bg = getComputedStyle(el).backgroundImage || '';
            const m = bg.match(/url\(["']?([^"')]+)["']?\)/i);
            return m ? m[1] : '';
          } catch {
            return '';
          }
        };

        const isVisible = (el, r) => {
          if (!r || r.width <= 0 || r.height <= 0) return false;
          const style = window.getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none') return false;
          if (Number(style.opacity || '1') === 0) return false;
          return true;
        };

        const badByUrl = (url) => {
          if (!url) return false;
          const lower = String(url).toLowerCase();
          const bad = [
            'logo','brand','icon','favicon','badge','seal','trust','rating','star','review',
            'guarantee','money-back','refund','shipping','delivery','payment','secure','visa',
            'mastercard','paypal','bonus','ebook','pixel','1x1','spacer',
          ];
          return bad.some((k) => lower.includes(k));
        };

        const hasVideoLike = (el) => {
          if (!el) return false;

          const tag = (el.tagName || '').toLowerCase();
          if (tag === 'iframe' || tag === 'video') return true;

          if (el.closest && el.closest('iframe,video')) return true;
          if (el.querySelector && el.querySelector('iframe,video')) return true;

          const embedHost =
            el.closest &&
            el.closest('[id*="vidalytics"],[class*="vidalytics"],[id*="embed"],[class*="embed"]');
          if (embedHost) return true;

          try {
            const s = window.getComputedStyle(el);
            const pt = (s.paddingTop || '').trim();
            const pos = (s.position || '').trim();
            if (pos === 'relative' && (pt === '56.25%' || pt === '56.250%' || pt === '56.3%'))
              return true;
          } catch {}

          return false;
        };

        // limpa marcações antigas se existirem
        for (const el of Array.from(document.querySelectorAll('[data-presell-hero],[data-presell-cand]'))) {
          el.removeAttribute('data-presell-hero');
          el.removeAttribute('data-presell-cand');
        }

        const candidates = [];

        for (const img of Array.from(document.images || [])) {
          const r = img.getBoundingClientRect();
          const src = img.currentSrc || img.src || '';
          candidates.push({ el: img, kind: 'img', r, url: src });
        }

        for (const el of Array.from(document.querySelectorAll('canvas'))) {
          const r = el.getBoundingClientRect();
          candidates.push({ el, kind: 'canvas', r, url: '' });
        }

        const bgEls = Array.from(document.querySelectorAll('section, div, figure, a, span'));
        for (const el of bgEls) {
          const url = getUrlFromBg(el);
          if (!url) continue;
          const r = el.getBoundingClientRect();
          candidates.push({ el, kind: 'bg', r, url });
        }

        const scored = [];

        for (const c of candidates) {
          if (hasVideoLike(c.el)) continue;

          const r = c.r;
          const topOk = r.top < VH && r.bottom > 0;
          if (!topOk) continue;

          const area = r.width * r.height;
          if (area < 22000) continue;

          if (!isVisible(c.el, r)) continue;
          if (c.url && badByUrl(c.url)) continue;

          const topPenalty = Math.max(0, r.top);

          let score = area - topPenalty * 50;

          // prioridade por tipo (sem excluir nada)
          if (c.kind === 'img') score += 50000;
          else if (c.kind === 'bg') score += 15000;

          // bônus leve por keyword
          if (c.url) {
            const u = String(c.url).toLowerCase();
            const good = ['bottle', 'bottles', 'product', 'products', 'jar', 'pack', 'bundle'];
            if (good.some((k) => u.includes(k))) score += 20000;
          }

          scored.push({ el: c.el, score });
        }

        if (!scored.length) return false;

        // ordena determinístico por score desc
        scored.sort((a, b) => b.score - a.score);

        // pega TOP N e rota por attempt
        const TOP_N = 5;
        const top = scored.slice(0, TOP_N);

        const idx = (Math.max(1, Number(attempt)) - 1) % top.length;
        const chosen = top[idx];

        // marca candidato escolhido
        chosen.el.setAttribute('data-presell-hero', '1');
        chosen.el.scrollIntoView({ block: 'center', inline: 'center' });

        return true;
      }, { attempt: safeAttempt });

      if (!marked) return '';

      const locator = page.locator('[data-presell-hero="1"]').first();
      await page.waitForTimeout(400);

      const buffer = await locator.screenshot({ type: 'png' });
      const base64 = buffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    });
  } catch {
    return '';
  }
}

module.exports = {
  extractHeroScreenshotDataUrl,
};
