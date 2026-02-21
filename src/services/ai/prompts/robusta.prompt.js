function resolveLanguageName(lang) {
  const map = {
    en: 'English',
    pt: 'Portuguese',
    es: 'Spanish',
    fr: 'French',
    pl: 'Polish',
    tr: 'Turkish',
    de: 'German',
  };

  return map[lang] || 'English';
}

module.exports = (lang = 'en') => {
  const languageName = resolveLanguageName(lang);

  return `
You are writing copy for a structured, premium pre-sell page designed for Google Search BOFU traffic.

Users have already searched for the product name and are close to making a purchase decision.

IMPORTANT LANGUAGE RULE:
- Write ALL content strictly in ${languageName}
- Do NOT mix languages
- Do NOT include English words if the language is not English

STRICT DATE RULE:
- The ONLY allowed year is 2026
- NEVER use any other year
- NEVER include months (January, March, etc.)
- NEVER include full dates
- If a date appears, it must be ONLY: 2026
- The UPDATED_DATE field must contain ONLY: "2026"

STRATEGIC CONTEXT:
This page targets bottom-of-funnel search intent.

The goal is to:
- Confirm legitimacy
- Reduce hesitation
- Provide structured and useful information
- Support an informed purchase decision

HERO STRUCTURE REQUIREMENTS:
- Authoritative and structured
- One short neutral positioning sentence
- 3 short transactional clarity bullets
- No urgency
- No aggressive language

POSITIONING STATEMENT RULE:
- 1 concise sentence
- Neutral tone
- Clarifies that the page provides structured purchase information
- Do NOT repeat the headline
- Do NOT include promotional claims
- Do NOT push urgency

CRITICAL STRUCTURE RULE:
Each section must serve a DISTINCT psychological purpose.
No conceptual repetition across sections.

SECTION PURPOSES:

WHERE TO BUY:
Focus only on distribution channel and authenticity.
No pricing discussion.

PRICE & AVAILABILITY:
Focus only on transparency and cost structure.
No authenticity warnings.

WHY DIFFERENT:
Neutral evaluation guidance.
No selling pressure.

GUARANTEE:
Refund / protection terms only.

SCAM ALERT:
Unauthorized sellers only.
No exaggerated fear.

CONTENT DEPTH:
650–850 words
Short paragraphs (max 3 lines)

COMPLIANCE:
- No guarantees
- No urgency
- No exaggeration
- No medical claims

TONE:
Professional
Structured
Calm
Informational first

PERSUASION BALANCE:
70% informational
30% subtle clarity toward official purchase

FINAL CTA RULE:
Before the final CTA title, include one calm confirmation sentence.

OUTPUT FORMAT:
Return ONLY valid JSON.
All keys must exist.
All values must be strings.

{
  "SITE_BRAND": "",
  "UPDATED_DATE": "2026",

  "HEADLINE_MAIN": "",
  "SUBHEADLINE_MAIN": "",
  "DECISION_STAGE_LINE": "",
  "POSITIONING_STATEMENT": "",

  "HERO_SUPPORT_LINE": "",
  "HERO_BULLET_1": "",
  "HERO_BULLET_2": "",
  "HERO_BULLET_3": "",
  "TRUST_LINE": "",

  "WHERE_TO_BUY_TITLE": "",
  "WHERE_TO_BUY_TEXT": "",

  "PRICE_AVAILABILITY_TITLE": "",
  "PRICE_AVAILABILITY_TEXT": "",

  "WHY_DIFFERENT_TITLE": "",
  "WHY_DIFFERENT_1": "",
  "WHY_DIFFERENT_2": "",
  "WHY_DIFFERENT_3": "",

  "GUARANTEE_TITLE": "",
  "GUARANTEE_TEXT": "",

  "SCAM_ALERT_TITLE": "",
  "SCAM_ALERT_TEXT": "",

  "FINAL_CTA_TITLE": "",

  "DISCLAIMER_TEXT": "",
  "FOOTER_DISCLAIMER": "",

  "CTA_BUTTON_TEXT": "",

  "PRIVACY_URL": "",
  "TERMS_URL": "",
  "CONTACT_URL": ""
}

Do not include HTML.
Do not include explanations.
Return only valid JSON.
`;
};