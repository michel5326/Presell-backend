const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

/**
 * Normaliza chaves da IA para UPPERCASE
 * (segurança contra variação do modelo)
 */
function normalizeCopyKeys(copy = {}) {
  const out = {};
  for (const k of Object.keys(copy)) {
    out[k.toUpperCase()] = copy[k];
  }
  return out;
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
   * 3) VIEW — 100% COMPATÍVEL COM:
   * - prompt atual da IA
   * - template review-light / review-dark
   */
  const view = {
    // ================= HERO =================
    HEADLINE:
      copy.HEADLINE_MAIN ||
      copy.HEADLINE ||
      'Product Review',

    SUBHEADLINE:
      copy.SUBHEADLINE_MAIN ||
      copy.SUBHEADLINE ||
      '',

    INTRO:
      copy.POSITIONING_STATEMENT ||
      copy.DECISION_STAGE_LINE ||
      copy.INTRO ||
      '',

    // ============== HOW IT WORKS ============
    WHY_IT_WORKS: [
      copy.MECHANISM_STEP_1,
      copy.MECHANISM_STEP_2,
      copy.MECHANISM_STEP_3,
    ]
      .filter(Boolean)
      .join(' '),

    // ================= FORMULA ===============
    FORMULA_TEXT:
      copy.FORMULA_TEXT ||
      '',

    // ================= BENEFITS ==============
    BENEFITS_LIST: [
      copy.WHY_DIFFERENT_1,
      copy.WHY_DIFFERENT_2,
      copy.WHY_DIFFERENT_3,
    ]
      .filter(Boolean)
      .map(text => `<div class="col">${text}</div>`)
      .join(''),

    // ================= SOCIAL PROOF ==========
    SOCIAL_PROOF:
      copy.TESTIMONIAL_NOTICE_TEXT ||
      copy.SCAM_ALERT_TEXT ||
      '',

    // ================= GUARANTEE =============
    GUARANTEE:
      copy.GUARANTEE_TEXT ||
      '',

    // ============== OPCIONAIS =================
    TESTIMONIAL_IMAGES: '',
    GUARANTEE_IMAGE: '',

    // ================= GLOBAL =================
    AFFILIATE_LINK: affiliateUrl,
    PRODUCT_IMAGE: image,
    CURRENT_YEAR: String(now.getFullYear()),
    PAGE_TITLE:
      copy.HEADLINE_MAIN ||
      'Review',
    META_DESCRIPTION:
      copy.SUBHEADLINE_MAIN ||
      '',
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
