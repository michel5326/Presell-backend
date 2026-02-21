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
  if (!lang || typeof lang !== 'string') return 'en';
  const clean = lang.toLowerCase().slice(0, 2);
  return /^[a-z]{2}$/.test(clean) ? clean : 'en';
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

  /* 1) IA */
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
    LANG_CODE: resolvedLang,
    CURRENT_YEAR: '2026',

    PAGE_TITLE: safe(copy.HEADLINE_MAIN) || 'Product Information',
    META_DESCRIPTION: safe(copy.SUBHEADLINE_MAIN),

    SITE_BRAND: safe(copy.SITE_BRAND) || 'Official Guide',
    UPDATED_DATE: safe(copy.UPDATED_DATE),
    AFFILIATE_LINK: affiliateUrl,

    /* HERO */
    DECISION_STAGE_LINE: safe(copy.DECISION_STAGE_LINE),
    HEADLINE_MAIN: safe(copy.HEADLINE_MAIN),
    SUBHEADLINE_MAIN: safe(copy.SUBHEADLINE_MAIN),
    POSITIONING_STATEMENT: safe(copy.POSITIONING_STATEMENT),
    CTA_BUTTON_TEXT: safe(copy.CTA_BUTTON_TEXT),
    PRODUCT_IMAGE: image,
    PRODUCT_NAME: safe(copy.PRODUCT_NAME),

    /* RATING */
    RATING_STARS: safe(copy.RATING_STARS),
    RATING_SCORE: safe(copy.RATING_SCORE),
    RATING_COUNT: safe(copy.RATING_COUNT),

    /* HERO BULLETS */
    HERO_BULLET_1: safe(copy.HERO_BULLET_1),
    HERO_BULLET_2: safe(copy.HERO_BULLET_2),
    HERO_BULLET_3: safe(copy.HERO_BULLET_3),

    /* TRUST BADGES */
    TRUST_BADGE_1: safe(copy.TRUST_BADGE_1),
    TRUST_BADGE_2: safe(copy.TRUST_BADGE_2),
    TRUST_BADGE_3: safe(copy.TRUST_BADGE_3),
    TRUST_BADGE_4: safe(copy.TRUST_BADGE_4),
    TRUST_BADGE_5: safe(copy.TRUST_BADGE_5),

    TRUST_SMALL_1: safe(copy.TRUST_SMALL_1),
    TRUST_SMALL_2: safe(copy.TRUST_SMALL_2),
    TRUST_SMALL_3: safe(copy.TRUST_SMALL_3),

    /* CONTENT */
    PRODUCT_OVERVIEW_TITLE: safe(copy.PRODUCT_OVERVIEW_TITLE),
    PRODUCT_OVERVIEW_TEXT: safe(copy.PRODUCT_OVERVIEW_TEXT),

    WHERE_TO_BUY_TITLE: safe(copy.WHERE_TO_BUY_TITLE),
    WHERE_TO_BUY_TEXT: safe(copy.WHERE_TO_BUY_TEXT),

    PRICE_AVAILABILITY_TITLE: safe(copy.PRICE_AVAILABILITY_TITLE),
    PRICE_AVAILABILITY_TEXT: safe(copy.PRICE_AVAILABILITY_TEXT),

    GUARANTEE_TITLE: safe(copy.GUARANTEE_TITLE),
    GUARANTEE_TEXT: safe(copy.GUARANTEE_TEXT),

    SCAM_ALERT_TITLE: safe(copy.SCAM_ALERT_TITLE),
    SCAM_ALERT_TEXT: safe(copy.SCAM_ALERT_TEXT),

    FINAL_CTA_TITLE: safe(copy.FINAL_CTA_TITLE),

    /* FOOTER */
    DISCLAIMER_TEXT: safe(copy.DISCLAIMER_TEXT),
    FOOTER_DISCLAIMER: safe(copy.FOOTER_DISCLAIMER),

    FOOTER_LINK_PRIVACY_TEXT: safe(copy.FOOTER_LINK_PRIVACY_TEXT),
    FOOTER_LINK_TERMS_TEXT: safe(copy.FOOTER_LINK_TERMS_TEXT),
    FOOTER_LINK_CONTACT_TEXT: safe(copy.FOOTER_LINK_CONTACT_TEXT),

    COPYRIGHT_TEXT: safe(copy.COPYRIGHT_TEXT),
    REDIRECTING_TEXT: safe(copy.REDIRECTING_TEXT),

    PRIVACY_URL: safe(copy.PRIVACY_URL),
    TERMS_URL: safe(copy.TERMS_URL),
    CONTACT_URL: safe(copy.CONTACT_URL),

    TRACKING_SCRIPT: safe(trackingScript),
  };

  /* 4) TEMPLATE */
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