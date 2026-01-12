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

async function generate({
  productUrl,
  affiliateUrl,
  attempt,
  theme,
  trackingScript, // ✅ RECEBE DO FRONT
}) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';

  /* 1) IA — ROBUSTA */
  const rawCopy = await aiService.generateCopy({
    type: 'robusta',
    productUrl,
  });

  const copy = normalizeCopyKeys(rawCopy);

  /* 2) IMAGEM */
  const image = await resolveProductImage(productUrl, attempt);
  const now = new Date();

  /* 3) VIEW — CONTRATO FIRME */
  const view = {
    /* META */
    PAGE_TITLE: safe(copy.HEADLINE_MAIN || copy.HEADLINE || 'Product Review'),
    META_DESCRIPTION: safe(copy.SUBHEADLINE_MAIN),
    LANG: 'en',

    /* BRAND */
    SITE_BRAND: safe(copy.SITE_BRAND) || 'Review Guide',
    CURRENT_YEAR: String(now.getFullYear()),
    UPDATED_DATE: safe(copy.UPDATED_DATE),
    AFFILIATE_LINK: affiliateUrl,

    /* HERO */
    DECISION_STAGE_LINE: safe(copy.DECISION_STAGE_LINE),
    HEADLINE_MAIN: safe(copy.HEADLINE_MAIN),
    SUBHEADLINE_MAIN: safe(copy.SUBHEADLINE_MAIN),
    POSITIONING_STATEMENT: safe(copy.POSITIONING_STATEMENT),
    CTA_BUTTON_TEXT: safe(copy.CTA_BUTTON_TEXT) || 'Visit Official Site',
    PRODUCT_IMAGE: image,

    /* PROBLEM */
    PRIMARY_PROBLEM_TITLE: safe(copy.PRIMARY_PROBLEM_TITLE),
    PRIMARY_PROBLEM_TEXT: safe(copy.PRIMARY_PROBLEM_TEXT),

    /* WHY DIFFERENT */
    WHY_DIFFERENT_TITLE: safe(copy.WHY_DIFFERENT_TITLE),
    WHY_DIFFERENT_1: safe(copy.WHY_DIFFERENT_1),
    WHY_DIFFERENT_2: safe(copy.WHY_DIFFERENT_2),
    WHY_DIFFERENT_3: safe(copy.WHY_DIFFERENT_3),

    /* MECHANISM */
    MECHANISM_TITLE: safe(copy.MECHANISM_TITLE),
    MECHANISM_STEP_1: safe(copy.MECHANISM_STEP_1),
    MECHANISM_STEP_2: safe(copy.MECHANISM_STEP_2),
    MECHANISM_STEP_3: safe(copy.MECHANISM_STEP_3),

    /* FORMULA */
    FORMULA_TEXT: safe(copy.FORMULA_TEXT),
    INGREDIENT_IMAGES: safe(copy.INGREDIENT_IMAGES),

    /* TARGET */
    WHO_SHOULD_USE_TITLE: safe(copy.WHO_SHOULD_USE_TITLE),
    WHO_SHOULD_1: safe(copy.WHO_SHOULD_1),
    WHO_SHOULD_2: safe(copy.WHO_SHOULD_2),
    WHO_SHOULD_3: safe(copy.WHO_SHOULD_3),

    WHO_SHOULD_NOT_TITLE: safe(copy.WHO_SHOULD_NOT_TITLE),
    WHO_NOT_1: safe(copy.WHO_NOT_1),
    WHO_NOT_2: safe(copy.WHO_NOT_2),
    WHO_NOT_3: safe(copy.WHO_NOT_3),

    /* TRUST */
    SCAM_ALERT_TITLE: safe(copy.SCAM_ALERT_TITLE),
    SCAM_ALERT_TEXT: safe(copy.SCAM_ALERT_TEXT),

    TESTIMONIAL_TITLE: safe(copy.TESTIMONIAL_TITLE),
    TESTIMONIAL_NOTICE_TEXT: safe(copy.TESTIMONIAL_NOTICE_TEXT),
    TESTIMONIAL_CTA_TEXT: safe(copy.TESTIMONIAL_CTA_TEXT),

    /* BONUS */
    BONUS_TITLE: safe(copy.BONUS_TITLE),
    BONUS_IMAGES: safe(copy.BONUS_IMAGES),

    /* GUARANTEE */
    GUARANTEE_TITLE: safe(copy.GUARANTEE_TITLE),
    GUARANTEE_TEXT: safe(copy.GUARANTEE_TEXT),
    GUARANTEE_IMAGE: safe(copy.GUARANTEE_IMAGE),

    /* LEGAL */
    DISCLAIMER_TEXT: safe(copy.DISCLAIMER_TEXT),
    FOOTER_DISCLAIMER: safe(copy.FOOTER_DISCLAIMER),

    /* LINKS */
    PRIVACY_URL: copy.PRIVACY_URL || '#',
    TERMS_URL: copy.TERMS_URL || '#',
    CONTACT_URL: copy.CONTACT_URL || '#',

    /* ✅ TRACKER (PASS-THROUGH PURO) */
    TRACKING_SCRIPT: safe(trackingScript),
  };

  /* 4) TEMPLATE */
  const templatePath =
    resolvedTheme === 'light'
      ? 'robusta/robusta-light.html'
      : 'robusta/robusta-dark.html';

  /* 5) RENDER */
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
