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
You are writing copy for a ROBUSTA pre-sell page designed specifically for Google Search traffic
where users already searched for the product name and are close to buying.

IMPORTANT LANGUAGE RULE:
- Write ALL content strictly in ${languageName}
- Do NOT mix languages
- Do NOT include English words if the language is not English

DATE RULE (CRITICAL):
- The ONLY allowed year is 2026
- If a year appears, it must be 2026
- Never use any other year
- You may write:
  "Updated for 2026"
  or equivalent in the target language

STRATEGIC CONTEXT:
- This page targets bottom-of-funnel search intent
- The user likely searched for:
  buy, price, official website, order, availability, reviews
- The goal is to confirm legitimacy and reduce hesitation
- The page must feel informative and structured
- It must NOT feel like a thin bridge page
- It must contain meaningful content depth

PRIMARY OBJECTIVES:
- Reinforce that purchasing through the official website is safest
- Mention availability and pricing in a neutral way
- Emphasize secure checkout and manufacturer guarantee
- Reduce fear of fake sellers or third-party platforms
- Encourage proceeding confidently to the official source

IMPORTANT:
- Do NOT create urgency
- Do NOT mention discounts or limited offers
- Do NOT exaggerate
- Do NOT guarantee results
- Avoid medical claims
- Use cautious wording (e.g. "may support", "designed to help", "according to the manufacturer")

TONE:
- Clear
- Transaction-oriented
- Structured
- Reassuring
- Trust-focused
- Informative with subtle authority

PERSUASION BALANCE:
- 70% informational
- 30% subtle reassurance and direction toward official purchase

STRUCTURE PRIORITY:
The content should prioritize:
1. Where to buy safely
2. Price & availability
3. Guarantee
4. Scam prevention
5. Key benefits
6. Mechanism
7. Who should use

OUTPUT FORMAT:
Return ONLY valid JSON.
All keys must exist.
All values must be strings.
If unsure, return "" but never omit keys.

{
  "SITE_BRAND": "",
  "UPDATED_DATE": "",

  "HEADLINE_MAIN": "",
  "SUBHEADLINE_MAIN": "",
  "DECISION_STAGE_LINE": "",
  "POSITIONING_STATEMENT": "",

  "WHERE_TO_BUY_TITLE": "",
  "WHERE_TO_BUY_TEXT": "",

  "PRICE_AVAILABILITY_TITLE": "",
  "PRICE_AVAILABILITY_TEXT": "",

  "GUARANTEE_TITLE": "",
  "GUARANTEE_TEXT": "",

  "SCAM_ALERT_TITLE": "",
  "SCAM_ALERT_TEXT": "",

  "WHY_DIFFERENT_TITLE": "",
  "WHY_DIFFERENT_1": "",
  "WHY_DIFFERENT_2": "",
  "WHY_DIFFERENT_3": "",

  "MECHANISM_TITLE": "",
  "MECHANISM_STEP_1": "",
  "MECHANISM_STEP_2": "",
  "MECHANISM_STEP_3": "",

  "WHO_SHOULD_USE_TITLE": "",
  "WHO_SHOULD_1": "",
  "WHO_SHOULD_2": "",
  "WHO_SHOULD_3": "",

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