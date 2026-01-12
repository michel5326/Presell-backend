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

/* ---------- BUILDERS (SEM LÓGICA) ---------- */

function renderFormulaComponents(list) {
  if (!Array.isArray(list) || !list.length) return null;

  return list.map(item => `
    <div class="col-md-6">
      <div class="card card-universal p-4">
        <div class="d-flex align-items-start gap-3">
          <i class="fas fa-leaf fa-lg text-success mt-1"></i>
          <div>
            <h6 class="fw-bold mb-1">${escapeHtml(item.title || '')}</h6>
            <p class="small text-muted mb-0">${escapeHtml(item.desc || '')}</p>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderBenefitsCards(list) {
  if (!Array.isArray(list) || !list.length) return null;

  return list.map(item => `
    <div class="col-md-6 col-lg-4">
      <div class="card card-universal p-4 text-center">
        <div class="card-icon">
          <i class="fas ${item.icon || 'fa-check-circle'}"></i>
        </div>
        <h5 class="fw-bold">${escapeHtml(item.title || '')}</h5>
        ${item.desc ? `<p class="small text-muted mb-0">${escapeHtml(item.desc)}</p>` : ``}
      </div>
    </div>
  `).join('');
}

function renderTestimonials(list) {
  if (!Array.isArray(list) || !list.length) return null;

  return list.map(t => {
    const full = Math.floor(Number(t.rating) || 0);
    const half = Number(t.rating) % 1 >= 0.5;

    const stars =
      '<i class="fas fa-star"></i>'.repeat(full) +
      (half ? '<i class="fas fa-star-half-alt"></i>' : '');

    return `
      <div class="col-md-4">
        <div class="card card-universal p-4 text-center">
          <div class="testimonial-stars mb-2">${stars}</div>
          <p class="fst-italic small text-muted">"${escapeHtml(t.text || '')}"</p>
          <strong class="d-block mt-2">${escapeHtml(t.name || '')}</strong>
        </div>
      </div>
    `;
  }).join('');
}

/* ---------- MAIN ---------- */

async function generate({
  productUrl,
  affiliateUrl,
  attempt,
  theme,
  trackingScript, // 👈 novo campo (opcional)
}) {
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

    FORMULA_COMPONENTS: renderFormulaComponents(copy.FORMULA_COMPONENTS),
    BENEFITS_CARDS: renderBenefitsCards(copy.BENEFITS),
    TESTIMONIAL_CARDS: renderTestimonials(copy.TESTIMONIALS),

    SOCIAL_PROOF: safe(copy.SOCIAL_PROOF),
    GUARANTEE: safe(copy.GUARANTEE),

    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),

    // 🔹 TRACKING — PASS THROUGH
    TRACKING_SCRIPT: safe(trackingScript),
  };

  const templatePath =
    resolvedTheme === 'light'
      ? 'review/review-light.html'
      : 'review/review-dark.html';

  const html = renderTemplate(templatePath, view);

  return { copy, image, html, theme: resolvedTheme, templatePath };
}

module.exports = { generate };
