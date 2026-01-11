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

async function generate({ productUrl, affiliateUrl, attempt, theme }) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';

  // 1) IA — ROBUSTA
  const rawCopy = await aiService.generateCopy({
    type: 'robusta',
    productUrl,
  });

  const copy = normalizeCopyKeys(rawCopy);

  // 2) IMAGEM
  const image = await resolveProductImage(productUrl, attempt);
  const now = new Date();

  // 3) VIEW — CONTRATO EXATO DO robusta-dark.html
  const view = {
    // HEADER / META
    PAGE_TITLE: copy.HEADLINE_MAIN || copy.HEADLINE || 'Product Review',
    META_DESCRIPTION: copy.SUBHEADLINE_MAIN || '',
    LANG: 'en',

    // BRAND / GLOBAL
    SITE_BRAND: copy.SITE_BRAND || 'Review Guide',
    CURRENT_YEAR: String(now.getFullYear()),
    UPDATED_DATE: copy.UPDATED_DATE || '',
    AFFILIATE_LINK: affiliateUrl,

    // HERO
    DECISION_STAGE_LINE: copy.DECISION_STAGE_LINE || '',
    HEADLINE_MAIN: copy.HEADLINE_MAIN || '',
    SUBHEADLINE_MAIN: copy.SUBHEADLINE_MAIN || '',
    POSITIONING_STATEMENT: copy.POSITIONING_STATEMENT || '',
    CTA_BUTTON_TEXT: copy.CTA_BUTTON_TEXT || 'Visit Official Site',
    PRODUCT_IMAGE: image,

    // PROBLEM
    PRIMARY_PROBLEM_TITLE: copy.PRIMARY_PROBLEM_TITLE || '',
    PRIMARY_PROBLEM_TEXT: copy.PRIMARY_PROBLEM_TEXT || '',

    // WHY DIFFERENT
    WHY_DIFFERENT_TITLE: copy.WHY_DIFFERENT_TITLE || '',
    WHY_DIFFERENT_1: copy.WHY_DIFFERENT_1 || '',
    WHY_DIFFERENT_2: copy.WHY_DIFFERENT_2 || '',
    WHY_DIFFERENT_3: copy.WHY_DIFFERENT_3 || '',

    // MECHANISM
    MECHANISM_TITLE: copy.MECHANISM_TITLE || '',
    MECHANISM_STEP_1: copy.MECHANISM_STEP_1 || '',
    MECHANISM_STEP_2: copy.MECHANISM_STEP_2 || '',
    MECHANISM_STEP_3: copy.MECHANISM_STEP_3 || '',

    // FORMULA
    FORMULA_TEXT: copy.FORMULA_TEXT || '',
    INGREDIENT_IMAGES: copy.INGREDIENT_IMAGES || '',

    // TARGET
    WHO_SHOULD_USE_TITLE: copy.WHO_SHOULD_USE_TITLE || '',
    WHO_SHOULD_1: copy.WHO_SHOULD_1 || '',
    WHO_SHOULD_2: copy.WHO_SHOULD_2 || '',
    WHO_SHOULD_3: copy.WHO_SHOULD_3 || '',

    WHO_SHOULD_NOT_TITLE: copy.WHO_SHOULD_NOT_TITLE || '',
    WHO_NOT_1: copy.WHO_NOT_1 || '',
    WHO_NOT_2: copy.WHO_NOT_2 || '',
    WHO_NOT_3: copy.WHO_NOT_3 || '',

    // SCAM / TESTIMONIAL
    SCAM_ALERT_TITLE: copy.SCAM_ALERT_TITLE || '',
    SCAM_ALERT_TEXT: copy.SCAM_ALERT_TEXT || '',
    TESTIMONIAL_TITLE: copy.TESTIMONIAL_TITLE || '',
    TESTIMONIAL_NOTICE_TEXT: copy.TESTIMONIAL_NOTICE_TEXT || '',
    TESTIMONIAL_CTA_TEXT: copy.TESTIMONIAL_CTA_TEXT || '',

    // BONUS
    BONUS_TITLE: copy.BONUS_TITLE || '',
    BONUS_IMAGES: copy.BONUS_IMAGES || '',

    // GUARANTEE / DISCLAIMERS
    GUARANTEE_TITLE: copy.GUARANTEE_TITLE || '',
    GUARANTEE_TEXT: copy.GUARANTEE_TEXT || '',
    GUARANTEE_IMAGE: copy.GUARANTEE_IMAGE || '',
    DISCLAIMER_TEXT: copy.DISCLAIMER_TEXT || '',
    FOOTER_DISCLAIMER: copy.FOOTER_DISCLAIMER || '',

    // LINKS FOOTER
    PRIVACY_URL: copy.PRIVACY_URL || '#',
    TERMS_URL: copy.TERMS_URL || '#',
    CONTACT_URL: copy.CONTACT_URL || '#',
  };

  // 4) TEMPLATE
  const templatePath =
    resolvedTheme === 'light'
      ? 'robusta/robusta-light.html'
      : 'robusta/robusta-dark.html';

  // 5) RENDER
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
