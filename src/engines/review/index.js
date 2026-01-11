const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

/**
 * Normaliza chaves da IA para UPPERCASE
 * (proteção contra variação do modelo)
 */
function normalizeCopyKeys(copy = {}) {
  const out = {};
  for (const k of Object.keys(copy)) {
    out[k.toUpperCase()] = copy[k];
  }
  return out;
}

/**
 * Helper: retorna null se string vazia
 * (Mustache/handlebars não renderiza se for null)
 */
function safe(val) {
  if (!val) return null;
  if (typeof val === 'string' && !val.trim()) return null;
  return val;
}

async function generate({ productUrl, affiliateUrl, attempt, theme }) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';

  /**
   * 1) GERAR COPY DA IA
   */
  const rawCopy = await aiService.generateCopy({
    type: 'review',
    productUrl,
  });

  const copy = normalizeCopyKeys(rawCopy);

  /**
   * 2) RESOLVER IMAGEM DO PRODUTO
   */
  const image = await resolveProductImage(productUrl, attempt);
  const now = new Date();

  /**
   * 3) VIEW — CONTRATO FIRME COM O TEMPLATE
   * - nunca envia string vazia
   * - se não existir, vira null (bloco não renderiza)
   */
  const view = {
    /* ================= HERO ================= */
    HEADLINE: safe(
      copy.HEADLINE_MAIN ||
      copy.HEADLINE ||
      'Product Review'
    ),

    SUBHEADLINE: safe(
      copy.SUBHEADLINE_MAIN ||
      copy.SUBHEADLINE
    ),

    INTRO: safe(
      copy.INTRO ||
      copy.POSITIONING_STATEMENT ||
      copy.DECISION_STAGE_LINE
    ),

    /* ============== HOW IT WORKS ============= */
    WHY_IT_WORKS: safe(
      [
        copy.MECHANISM_STEP_1,
        copy.MECHANISM_STEP_2,
        copy.MECHANISM_STEP_3,
      ].filter(Boolean).join(' ')
    ),

    /* ================= FORMULA =============== */
    FORMULA_TEXT: safe(copy.FORMULA_TEXT),

    /* ================= BENEFITS ============== */
    BENEFITS_LIST: safe(
      [
        copy.WHY_DIFFERENT_1,
        copy.WHY_DIFFERENT_2,
        copy.WHY_DIFFERENT_3,
      ]
        .filter(Boolean)
        .map(text => `
          <div class="col-md-6 col-lg-4">
            <div class="card-universal p-3 h-100">
              ${text}
            </div>
          </div>
        `)
        .join('')
    ),

    /* ================= SOCIAL PROOF ========== */
    SOCIAL_PROOF: safe(
      copy.SOCIAL_PROOF ||
      copy.TESTIMONIAL_NOTICE_TEXT
    ),

    /* ================= GUARANTEE ============= */
    GUARANTEE: safe(
      copy.GUARANTEE ||
      copy.GUARANTEE_TEXT
    ),

    /* ============== OPCIONAIS ================= */
    TESTIMONIAL_IMAGES: null,
    GUARANTEE_IMAGE: null,
    INGREDIENT_IMAGES: null,
    BONUS_IMAGES: null,

    /* ================= GLOBAL ================= */
    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),
    PAGE_TITLE: safe(
      copy.HEADLINE_MAIN ||
      copy.HEADLINE ||
      'Review'
    ),
    META_DESCRIPTION: safe(
      copy.SUBHEADLINE_MAIN ||
      copy.SUBHEADLINE
    ),
    LANG: 'en',
  };

  /**
   * 4) TEMPLATE
   */
  const templatePath =
    resolvedTheme === 'light'
      ? 'review/review-light.html'
      : 'review/review-dark.html';

  const html = renderTemplate(templatePath, view);

  /**
   * 5) RESPONSE
   */
  return {
    copy,
    image,
    html,
    theme: resolvedTheme,
    templatePath,
  };
}

module.exports = { generate };
