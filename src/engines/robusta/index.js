const aiService = require('../../services/ai');
const { resolveProductImage } = require('../product-images');
const { renderTemplate } = require('../../templates/renderTemplate.service');
const fs = require('fs');
const path = require('path');

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

function templateExists(relativePath) {
  const fullPath = path.join(__dirname, '../../templates', relativePath);
  return fs.existsSync(fullPath);
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

  const now = new Date();

  /* 3) VIEW */
  const view = {
    PAGE_TITLE: safe(copy.HEADLINE_MAIN) || 'Product Information',
    META_DESCRIPTION: safe(copy.SUBHEADLINE_MAIN),
    LANG: resolvedLang,

    SITE_BRAND: safe(copy.SITE_BRAND) || 'Official Guide',
    CURRENT_YEAR: String(now.getFullYear()),
    UPDATED_DATE: safe(copy.UPDATED_DATE),
    AFFILIATE_LINK: affiliateUrl,

    DECISION_STAGE_LINE: safe(copy.DECISION_STAGE_LINE),
    HEADLINE_MAIN: safe(copy.HEADLINE_MAIN),
    SUBHEADLINE_MAIN: safe(copy.SUBHEADLINE_MAIN),
    POSITIONING_STATEMENT: safe(copy.POSITIONING_STATEMENT),
    CTA_BUTTON_TEXT: safe(copy.CTA_BUTTON_TEXT) || 'Visit Official Website',
    PRODUCT_IMAGE: image,

    /* 🔥 HERO BULLETS (NOVO SCHEMA) */
    HERO_BULLET_1: safe(copy.HERO_BULLET_1),
    HERO_BULLET_2: safe(copy.HERO_BULLET_2),
    HERO_BULLET_3: safe(copy.HERO_BULLET_3),

    /* 🔥 PRODUCT OVERVIEW (NOVO SCHEMA) */
    PRODUCT_OVERVIEW_TITLE: safe(copy.PRODUCT_OVERVIEW_TITLE),
    PRODUCT_OVERVIEW_TEXT: safe(copy.PRODUCT_OVERVIEW_TEXT),

    /* 🔥 BOFU BLOCS */
    WHERE_TO_BUY_TITLE: safe(copy.WHERE_TO_BUY_TITLE),
    WHERE_TO_BUY_TEXT: safe(copy.WHERE_TO_BUY_TEXT),

    PRICE_AVAILABILITY_TITLE: safe(copy.PRICE_AVAILABILITY_TITLE),
    PRICE_AVAILABILITY_TEXT: safe(copy.PRICE_AVAILABILITY_TEXT),

    FINAL_CTA_TITLE: safe(copy.FINAL_CTA_TITLE),

    /* LEGACY (mantidos se ainda existir template antigo) */
    WHY_DIFFERENT_TITLE: safe(copy.WHY_DIFFERENT_TITLE),
    WHY_DIFFERENT_1: safe(copy.WHY_DIFFERENT_1),
    WHY_DIFFERENT_2: safe(copy.WHY_DIFFERENT_2),
    WHY_DIFFERENT_3: safe(copy.WHY_DIFFERENT_3),

    MECHANISM_TITLE: safe(copy.MECHANISM_TITLE),
    MECHANISM_STEP_1: safe(copy.MECHANISM_STEP_1),
    MECHANISM_STEP_2: safe(copy.MECHANISM_STEP_2),
    MECHANISM_STEP_3: safe(copy.MECHANISM_STEP_3),

    WHO_SHOULD_USE_TITLE: safe(copy.WHO_SHOULD_USE_TITLE),
    WHO_SHOULD_1: safe(copy.WHO_SHOULD_1),
    WHO_SHOULD_2: safe(copy.WHO_SHOULD_2),
    WHO_SHOULD_3: safe(copy.WHO_SHOULD_3),

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

  /* 4) TEMPLATE */
  const baseName = `robusta-${resolvedTheme}`;
  const localized = `robusta/${baseName}-${resolvedLang}.html`;
  const fallback = `robusta/${baseName}.html`;

  const templatePath = templateExists(localized) ? localized : fallback;

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