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
You are writing copy for a ROBUSTA pre-sell page designed for Google Search traffic.
Users have already searched for the product name and are close to making a purchase decision.

IMPORTANT LANGUAGE RULE:
- Write ALL content strictly in ${languageName}
- Do NOT mix languages
- Do NOT include English words if the language is not English

DATE RULE:
- The only allowed year is 2026
- If a year appears, it must be 2026
- Never use any other year

STRATEGIC CONTEXT:
This page targets bottom-of-funnel search intent.
The user likely searched:
- buy [product]
- [product] official website
- [product] price
- where to order [product]
- [product] availability

The goal is to:
- Confirm legitimacy
- Reduce hesitation
- Provide structured and useful information
- Support an informed purchase decision

CRITICAL STRUCTURE RULE (ANTI-REPETITION):
Each section must serve a DISTINCT psychological purpose.
Do NOT repeat the same justification across sections.
Do NOT restate “buy from official website” in multiple blocks.
Avoid repeating phrases like:
- official website
- secure checkout
- manufacturer guarantee
- avoid third-party sellers

If these concepts are used, they must appear in different contexts and with new information.

SECTION PURPOSES MUST BE:

1. WHERE TO BUY
Focus on distribution model and authenticity.
Do NOT repeat pricing or scam warnings here.

2. PRICE & AVAILABILITY
Focus on transparency, stock control, and updated information.
Do NOT repeat scam or authenticity warnings.

3. GUARANTEE
Focus only on purchase protection and satisfaction policy.
Do NOT repeat “official website” warnings.

4. SCAM ALERT
Focus only on identifying unauthorized listings.
Do NOT restate pricing or guarantee information.

5. EDUCATIONAL DEPTH
Include at least one neutral informational section that does not push the sale.
For example:
- What to review before ordering
- How to evaluate a supplement
- Understanding the formulation
This reduces the appearance of a bridge page.

CONTENT DEPTH:
- Minimum 800 words total
- Provide meaningful informational value
- Must not feel like a redirect page

COMPLIANCE RULES:
- Do NOT guarantee results
- Do NOT create urgency
- Do NOT mention limited offers
- Do NOT exaggerate
- Avoid medical claims
- Use cautious language such as:
  "may support"
  "designed to"
  "according to the manufacturer"

TONE:
- Informative first
- Transaction-aware but not aggressive
- Structured
- Professional
- Calm and authoritative

PERSUASION BALANCE:
- 75% informational
- 25% subtle direction toward official purchase

FINAL CTA RULE:
Before the final CTA, include a calm confirmation sentence such as:
"If you feel ready to proceed after reviewing the information above, you may access the official order page below."
It must feel natural and not promotional.

OUTPUT FORMAT:
Return ONLY valid JSON.
All keys must exist.
All values must be strings.
Never omit keys.

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