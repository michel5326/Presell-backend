const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

function normalizeCopyKeys(copy = {}) {
  const out = {};
  for (const k of Object.keys(copy)) {
    out[k.toUpperCase()] = copy[k];
  }
  return out;
}

function safe(val) {
  if (!val) return null;
  if (typeof val === 'string' && !val.trim()) return null;
  return val;
}

/* ---------- BUILDERS ---------- */

function buildFormulaComponents(copy) {
  const text = safe(copy.FORMULA_TEXT);
  if (!text) return null;

  return `
    <div class="col-lg-6">
      <div class="card card-universal p-4">
        <h3 class="h4 mb-3">Formula Details</h3>
        <p class="mb-0">${text}</p>
      </div>
    </div>
  `;
}

function buildBenefitsCards(copy) {
  const raw = copy.BENEFITS_LIST;
  if (!raw) return null;

  let items = [];

  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === 'string') {
    items = raw
      .split('\n')
      .map(v => v.replace(/^[-•✅🧪🔍⚖️🛡️]+/, '').trim())
      .filter(Boolean);
  }

  if (!items.length) return null;

  return items.map(text => `
    <div class="col-md-6 col-lg-4">
      <div class="card card-universal p-4 text-center">
        <div class="card-icon"><i class="fas fa-check"></i></div>
        <h5 class="fw-bold">${text.split(':')[0]}</h5>
        <p class="small text-muted">${text}</p>
      </div>
    </div>
  `).join('');
}

function buildTestimonialCards(copy) {
  const raw = copy.TESTIMONIALS || copy.SOCIAL_PROOF;
  if (!raw) return null;

  const testimonials = Array.isArray(raw)
    ? raw
    : [
        {
          name: 'Verified User',
          rating: 4.5,
          text: raw,
        },
      ];

  return testimonials.map(t => {
    const starsFull = Math.floor(t.rating || 5);
    const half = (t.rating || 5) % 1 >= 0.5;
    const stars =
      '<i class="fas fa-star"></i>'.repeat(starsFull) +
      (half ? '<i class="fas fa-star-half-alt"></i>' : '');

    return `
      <div class="col-md-4">
        <div class="card card-universal p-4 text-center">
          <div class="testimonial-stars mb-2">${stars}</div>
          <p class="fst-italic small text-muted">"${t.text}"</p>
          <strong class="d-block mt-2">${t.name}</strong>
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
    // SEO
    PAGE_TITLE: safe(copy.HEADLINE) || 'Product Review',
    META_DESCRIPTION: safe(copy.SUBHEADLINE),
    LANG: 'en',

    // HERO
    HEADLINE: safe(copy.HEADLINE),
    SUBHEADLINE: safe(copy.SUBHEADLINE),
    INTRO: safe(copy.INTRO),

    // CONTENT
    WHY_IT_WORKS: safe(copy.WHY_IT_WORKS),
    FORMULA_COMPONENTS: buildFormulaComponents(copy),
    BENEFITS_CARDS: buildBenefitsCards(copy),
    TESTIMONIAL_CARDS: buildTestimonialCards(copy),
    SOCIAL_PROOF: safe(copy.SOCIAL_PROOF),
    GUARANTEE: safe(copy.GUARANTEE),

    // GLOBAL
    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),
  };

  const templatePath =
    resolvedTheme === 'light'
      ? 'review/review-light.html'
      : 'review/review-dark.html';

  const html = renderTemplate(templatePath, view);

  return {
    copy,
    image,
    html,
    theme: resolvedTheme,
    templatePath,
  };
}

module.exports = { generate };
