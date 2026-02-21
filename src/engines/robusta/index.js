const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');

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

function normalizeLang(lang) {
  const supported = ['en', 'pt', 'es', 'fr', 'pl', 'tr', 'de'];
  return supported.includes(lang) ? lang : 'en';
}

async function generate({
  productUrl,
  affiliateUrl,
  attempt,
  theme,
  trackingScript,
  productImageUrl,
  lang = 'en',
}) {
  const resolvedTheme = theme === 'light' ? 'light' : 'dark';
  const resolvedLang = normalizeLang(lang);

  /* 1) IA — ROBUSTA */
  const rawCopy = await aiService.generateCopy({
    type: 'robusta',
    productUrl,
    lang: resolvedLang,
  });

  const copy = normalizeCopyKeys(rawCopy);

  /* 2) IMAGEM */
  const image = await resolveProductImage(
    productUrl,
    attempt,
    safe(productImageUrl)
  );

  /* 3) VIEW */
  const view = {
    PAGE_TITLE: safe(copy.HEADLINE_MAIN) || 'Product Information',
    META_DESCRIPTION: safe(copy.SUBHEADLINE_MAIN),

    /* 🔥 CORRIGIDO */
    LANG_CODE: resolvedLang,

    SITE_BRAND: safe(copy.SITE_BRAND) || 'Official Guide',

    /* 🔥 FIXO PARA EVITAR QUEBRA FUTURA */
    CURRENT_YEAR: '2026',

    UPDATED_DATE: safe(copy.UPDATED_DATE),
    AFFILIATE_LINK: affiliateUrl,

    DECISION_STAGE_LINE: safe(copy.DECISION_STAGE_LINE),
    HEADLINE_MAIN: safe(copy.HEADLINE_MAIN),
    SUBHEADLINE_MAIN: safe(copy.SUBHEADLINE_MAIN),
    POSITIONING_STATEMENT: safe(copy.POSITIONING_STATEMENT),
    CTA_BUTTON_TEXT: safe(copy.CTA_BUTTON_TEXT) || 'Visit Official Website',
    PRODUCT_IMAGE: image,

    HERO_BULLET_1: safe(copy.HERO_BULLET_1),
    HERO_BULLET_2: safe(copy.HERO_BULLET_2),
    HERO_BULLET_3: safe(copy.HERO_BULLET_3),

    PRODUCT_OVERVIEW_TITLE: safe(copy.PRODUCT_OVERVIEW_TITLE),
    PRODUCT_OVERVIEW_TEXT: safe(copy.PRODUCT_OVERVIEW_TEXT),

    WHERE_TO_BUY_TITLE: safe(copy.WHERE_TO_BUY_TITLE),
    WHERE_TO_BUY_TEXT: safe(copy.WHERE_TO_BUY_TEXT),

    PRICE_AVAILABILITY_TITLE: safe(copy.PRICE_AVAILABILITY_TITLE),
    PRICE_AVAILABILITY_TEXT: safe(copy.PRICE_AVAILABILITY_TEXT),

    FINAL_CTA_TITLE: safe(copy.FINAL_CTA_TITLE),

    SCAM_ALERT_TITLE: safe(copy.SCAM_ALERT_TITLE),
    SCAM_ALERT_TEXT: safe(copy.SCAM_ALERT_TEXT),

    GUARANTEE_TITLE: safe(copy.GUARANTEE_TITLE),
    GUARANTEE_TEXT: safe(copy.GUARANTEE_TEXT),

    DISCLAIMER_TEXT: safe(copy.DISCLAIMER_TEXT),
    FOOTER_DISCLAIMER: safe(copy.FOOTER_DISCLAIMER),

    PRIVACY_URL: copy.PRIVACY_URL || '#',
    TERMS_URL: copy.TERMS_URL || '#',
    CONTACT_URL: copy.CONTACT_URL || '#',

    TRACKING_SCRIPT: safe(trackingScript),
  };

  /* 4) TEMPLATE (ÚNICO) */
  const templatePath = `robusta/robusta-${resolvedTheme}.html`;

  /* 5) RENDER */
  const html = renderTemplate(templatePath, view);

  return {
    copy,
    image,
    html,
    theme: resolvedTheme,
    templatePath,
    lang: resolvedLang,
  };
}

module.exports = { generate };