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

  const items = text
    .split(/,|\n/)
    .map(v => v.trim())
    .filter(v => v.length > 3);

  return items.map(item => `
    <div class="col-md-6">
      <div class="card card-universal p-4">
        <div class="d-flex align-items-start gap-3">
          <i class="fas fa-leaf fa-lg text-success mt-1"></i>
          <div>
            <h6 class="fw-bold mb-1">${item}</h6>
            <p class="small text-muted mb-0">Ingredient commonly used in prostate supplements.</p>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function buildBenefitsCards(copy) {
  const raw = copy.BENEFITS_LIST;
  if (!raw) return null;

  const items = raw
    .split('\n')
    .map(v => v.trim())
    .filter(Boolean);

  const icons = [
    'fa-procedures',
    'fa-flask',
    'fa-tint',
    'fa-balance-scale',
    'fa-shield-alt'
  ];

  return items.map((text, i) => `
    <div class="col-md-6 col-lg-4">
      <div class="card card-universal p-4 text-center">
        <div class="card-icon">
          <i class="fas ${icons[i % icons.length]}"></i>
        </div>
        <h5 class="fw-bold">${text}</h5>
        <p class="small text-muted">${text}</p>
      </div>
    </div>
  `).join('');
}

function buildTestimonialCards() {
  const testimonials = [
    {
      name: 'Mark T.',
      rating: 4.5,
      text: 'I noticed better comfort and fewer nightly disruptions.'
    },
    {
      name: 'James R.',
      rating: 5,
      text: 'Easy to take and I like that it uses natural ingredients.'
    },
    {
      name: 'David L.',
      rating: 4,
      text: 'Shipping was fast and the formula feels well thought out.'
    }
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
