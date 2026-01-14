const aiService = require('../../services/ai');
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

/* ---------- MAIN ---------- */

async function generate({
  affiliateUrl,
  problem,
  adPhrase,
  trackingScript,
}) {

  // 🔒 IA: copy editorial TOF
  const rawCopy = await aiService.generateCopy({
    type: 'editorial',
    problem,
    adPhrase,
  });

  const copy = normalizeCopyKeys(rawCopy);
  const now = new Date();

  const view = {
    LANG: 'en',

    PAGE_TITLE: safe(copy.HEADLINE),
    META_DESCRIPTION: safe(copy.SUBHEADLINE),

    SITE_BRAND: 'Editorial Report',
    UPDATED_DATE: now.toLocaleDateString('en-US'),

    HEADLINE: safe(copy.HEADLINE),
    SUBHEADLINE: safe(copy.SUBHEADLINE),
    INTRO: safe(copy.INTRO),

    PRIMARY_PROBLEM_TITLE: safe(copy.PRIMARY_PROBLEM_TITLE),
    PRIMARY_PROBLEM_TEXT: safe(copy.PRIMARY_PROBLEM_TEXT),

    MECHANISM_TITLE: safe(copy.MECHANISM_TITLE),

    AFFILIATE_LINK: affiliateUrl,
    DISCLAIMER_TEXT: safe(copy.DISCLAIMER),

    CURRENT_YEAR: String(now.getFullYear()),

    // 🔒 TRACKER (PASS-THROUGH)
    TRACKING_SCRIPT: safe(trackingScript),
  };

  const templatePath = 'editorial/editorial-tof.html';

  const html = renderTemplate(templatePath, view);

  return {
    copy,
    html,
    templatePath,
  };
}

module.exports = { generate };
