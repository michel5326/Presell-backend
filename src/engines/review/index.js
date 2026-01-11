const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

/* ---------- HELPERS ---------- */

function normalizeCopyKeys(copy = {}) {
  const out = {};
  for (const k of Object.keys(copy)) out[k.toUpperCase()] = copy[k];
  return out;
}

function safe(val) {
  if (!val) return null;
  if (typeof val === 'string' && !val.trim()) return null;
  return val;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function splitLines(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(v => String(v)).filter(Boolean);

  return String(raw)
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map(v => v.trim())
    .filter(Boolean);
}

function extractLeadingEmoji(line) {
  // pega 1 emoji no começo, se existir
  const m = line.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}✅🧪🔍⚖️🛡️🌿📦⭐️⭐])/u);
  if (!m) return { emoji: null, rest: line.trim() };
  const emoji = m[1];
  const rest = line.slice(m[0].length).trim();
  return { emoji, rest };
}

function iconForEmoji(emoji, index) {
  const map = {
    '✅': 'fa-check-circle',
    '🧪': 'fa-flask',
    '🔍': 'fa-search',
    '⚖️': 'fa-balance-scale',
    '🛡️': 'fa-shield-alt',
    '🌿': 'fa-leaf',
    '📦': 'fa-box',
    '⭐': 'fa-star',
    '⭐️': 'fa-star',
  };

  if (emoji && map[emoji]) return map[emoji];

  const fallback = [
    'fa-check-circle',
    'fa-star',
    'fa-heart',
    'fa-flask',
    'fa-shield-alt',
    'fa-leaf',
    'fa-balance-scale',
    'fa-search',
  ];

  return fallback[index % fallback.length];
}

function titleAndDesc(text) {
  const clean = String(text).trim();

  // tenta separar "Titulo: descrição"
  const parts = clean.split(/:\s+/);
  if (parts.length >= 2) {
    return { title: parts[0].trim(), desc: parts.slice(1).join(': ').trim() };
  }

  // se for grande, faz título curto + descrição completa
  if (clean.length > 60) {
    const words = clean.split(/\s+/).filter(Boolean);
    const title = words.slice(0, Math.min(6, words.length)).join(' ');
    return { title, desc: clean };
  }

  // pequeno: só título
  return { title: clean, desc: null };
}

/* ---------- BUILDERS (NEUTROS) ---------- */

function buildFormulaComponents(copy) {
  const raw = safe(copy.FORMULA_TEXT);
  if (!raw) return null;

  // tenta extrair lista de "ingredientes" de forma genérica
  const cleaned = String(raw)
    .replace(/^.*?(includes|contains|features)\s+(ingredients\s+like\s+)?/i, '')
    .replace(/(manufactured|made)\s+in\s+.*$/i, '')
    .replace(/\.\s.*$/s, (m) => m); // mantém texto, mas sem depender

  let items = cleaned
    .replace(/\band\b/gi, ',')
    .split(',')
    .map(v => v.trim())
    .filter(v => v && v.length <= 50 && v.length >= 3);

  // fallback: se não extrair, quebra por linhas
  if (items.length < 2) items = splitLines(raw);

  // limitar pra não explodir layout
  items = items.slice(0, 8);

  if (!items.length) return null;

  return items.map(item => `
    <div class="col-md-6">
      <div class="card card-universal p-4">
        <div class="d-flex align-items-start gap-3">
          <i class="fas fa-leaf fa-lg text-success mt-1"></i>
          <div>
            <h6 class="fw-bold mb-1">${escapeHtml(item)}</h6>
            <p class="small text-muted mb-0">Commonly included in supplement formulas.</p>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function buildBenefitsCards(copy) {
  const raw = safe(copy.BENEFITS_LIST);
  if (!raw) return null;

  const lines = splitLines(raw);
  if (!lines.length) return null;

  return lines.map((line, i) => {
    const { emoji, rest } = extractLeadingEmoji(line);
    const icon = iconForEmoji(emoji, i);

    // remove bullets comuns no começo
    const normalized = rest.replace(/^[-•]+/, '').trim();
    const { title, desc } = titleAndDesc(normalized);

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card card-universal p-4 text-center">
          <div class="card-icon">
            <i class="fas ${icon}"></i>
          </div>
          <h5 class="fw-bold">${escapeHtml(title)}</h5>
          ${desc ? `<p class="small text-muted mb-0">${escapeHtml(desc)}</p>` : ``}
        </div>
      </div>
    `;
  }).join('');
}

function buildTestimonialCards() {
  const testimonials = [
    { name: 'Emily R.', rating: 5, text: 'Easy to include in my routine and I felt good about the quality.' },
    { name: 'Alex M.', rating: 4.5, text: 'Arrived quickly and matched what I expected from the description.' },
    { name: 'Jordan L.', rating: 4, text: 'Solid overall experience and straightforward to use.' },
  ];

  return testimonials.map(t => {
    const full = Math.floor(t.rating);
    const half = t.rating % 1 >= 0.5;

    const stars =
      '<i class="fas fa-star"></i>'.repeat(full) +
      (half ? '<i class="fas fa-star-half-alt"></i>' : '');

    return `
      <div class="col-md-4">
        <div class="card card-universal p-4 text-center">
          <div class="testimonial-stars mb-2">${stars}</div>
          <p class="fst-italic small text-muted">"${escapeHtml(t.text)}"</p>
          <strong class="d-block mt-2">${escapeHtml(t.name)}</strong>
        </div>
      </div>
    `;
  }).join('');
}

/* ---------- MAIN ---------- */

async function generate({ productUrl, affiliateUrl, attempt, theme }) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';

  const rawCopy = await aiService.generateCopy({
    type: 'review',
    productUrl,
  });

  const copy = normalizeCopyKeys(rawCopy);
  const image = await resolveProductImage(productUrl, attempt);
  const now = new Date();

  const view = {
    PAGE_TITLE: safe(copy.HEADLINE) || 'Product Review',
    META_DESCRIPTION: safe(copy.SUBHEADLINE),
    LANG: 'en',

    HEADLINE: safe(copy.HEADLINE),
    SUBHEADLINE: safe(copy.SUBHEADLINE),
    INTRO: safe(copy.INTRO),

    WHY_IT_WORKS: safe(copy.WHY_IT_WORKS),
    FORMULA_COMPONENTS: buildFormulaComponents(copy),
    BENEFITS_CARDS: buildBenefitsCards(copy),
    TESTIMONIAL_CARDS: buildTestimonialCards(),
    SOCIAL_PROOF: safe(copy.SOCIAL_PROOF),
    GUARANTEE: safe(copy.GUARANTEE),

    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),
  };

  const templatePath =
    resolvedTheme === 'light'
      ? 'review/review-light.html'
      : 'review/review-dark.html';

  const html = renderTemplate(templatePath, view);

  return { copy, image, html, theme: resolvedTheme, templatePath };
}

module.exports = { generate };
