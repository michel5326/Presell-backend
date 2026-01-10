const { withPage } = require('../../../services/browser/playwright.service');

function looksBadUrl(u) {
  if (!u || typeof u !== 'string') return true;
  const lower = u.toLowerCase();

  if (lower.startsWith('data:')) return true;
  if (lower.endsWith('.svg')) return true;

  // trackers / pixels
  if (lower.includes('pixel') || lower.includes('1x1') || lower.includes('spacer'))
    return true;

  // identidade / ui / selos / pagamentos / bônus
  const bad = [
    'logo',
    'brand',
    'icon',
    'favicon',
    'sprite',
    'badge',
    'seal',
    'trust',
    'rating',
    'star',
    'review',
    'guarantee',
    'money-back',
    'refund',
    'shipping',
    'delivery',
    'payment',
    'secure',
    'visa',
    'mastercard',
    'paypal',
    'bonus',
    'ebook',
  ];
  if (bad.some((k) => lower.includes(k))) return true;

  return false;
}

async function extractHeroScreenshotDataUrl(productUrl) {
  if (!productUrl) return '';

  try {
    return await withPage(async (page) => {
      // 1) carrega
      await page.goto(productUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // dá tempo pra lazy/anim iniciar (curto)
      await page.waitForTimeout(1200);

      // 2) marca o “melhor candidato visual” na dobra
      const marked = await page.evaluate(() => {
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
            'logo',
            'brand',
            'icon',
            'favicon',
            'badge',
            'seal',
            'trust',
            'rating',
            'star',
            'review',
            'guarantee',
            'money-back',
            'refund',
            'shipping',
            'delivery',
            'payment',
            'secure',
            'visa',
            'mastercard',
            'paypal',
            'bonus',
            'ebook',
            'pixel',
            '1x1',
            'spacer',
          ];
          return bad.some((k) => lower.includes(k));
        };

        // ✅ NOVO: bloqueia vídeo/iframe e qualquer container que tenha eles
        const hasVideoLike = (el) => {
          if (!el) return false;
          const tag = (el.tagName || '').toLowerCase();
          if (tag === 'iframe' || tag === 'video') return true;
          if (el.closest && el.closest('iframe,video')) return true;
          if (el.querySelector && el.querySelector('iframe,video')) return true;
          return false;
        };

        const candidates = [];

        // imgs
        for (const img of Array.from(document.images || [])) {
          const r = img.getBoundingClientRect();
          const src = img.currentSrc || img.src || '';
          candidates.push({ el: img, kind: 'img', r, url: src });
        }

        // canvases (mantido)
        for (const el of Array.from(document.querySelectorAll('canvas'))) {
          const r = el.getBoundingClientRect();
          candidates.push({ el, kind: 'canvas', r, url: '' });
        }

        // backgrounds (apenas elementos relevantes)
        const bgEls = Array.from(document.querySelectorAll('section, div, figure, a, span'));
        for (const el of bgEls) {
          const url = getUrlFromBg(el);
          if (!url) continue;
          const r = el.getBoundingClientRect();
          candidates.push({ el, kind: 'bg', r, url });
        }

        let best = null;

        for (const c of candidates) {
          // ✅ NOVO: evita cair em vídeo/iframe (e containers deles)
          if (hasVideoLike(c.el)) continue;

          const r = c.r;

          // precisa estar na 1ª dobra (ou bem perto)
          const topOk = r.top < VH && r.bottom > 0;
          if (!topOk) continue;

          // tamanho mínimo (evita ícones)
          const area = r.width * r.height;
          if (area < 22000) continue;

          if (!isVisible(c.el, r)) continue;

          // se tem url, bloqueia ruins
          if (c.url && badByUrl(c.url)) continue;

          // score: grande + mais perto do topo
          const topPenalty = Math.max(0, r.top);
          const score = area - topPenalty * 50;

          if (!best || score > best.score) {
            best = { el: c.el, score };
          }
        }

        if (!best) return false;

        // marca
        best.el.setAttribute('data-presell-hero', '1');

        // garante que o element esteja “na tela”
        best.el.scrollIntoView({ block: 'center', inline: 'center' });

        return true;
      });

      if (!marked) return '';

      // 3) screenshot do elemento marcado (recorte automático)
      const locator = page.locator('[data-presell-hero="1"]').first();

      // dá uma micro pausa após scroll
      await page.waitForTimeout(400);

      const buffer = await locator.screenshot({
        type: 'png',
      });

      // 4) retorna data URL (automático, sem storage)
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
