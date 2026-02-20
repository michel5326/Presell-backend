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
You are writing copy for a ROBUSTA (pre-sell) page aimed at users who already searched for the product
and are close to making a purchase decision.

IMPORTANT LANGUAGE RULE:
- Write ALL content strictly in the following language: ${languageName}
- Do NOT mix languages
- Do NOT include any English if the language is not English

DATE RULE (CRITICAL):
- The ONLY allowed numeric year is 2026
- If a year is included anywhere in the output, it MUST be 2026
- NEVER use 2024, 2025, 2027 or any other year
- Do NOT invent specific publication dates (no full dates like March 2026)
- You may use:
  "Updated for 2026"
  "Latest 2026 Information"
  or equivalent in the target language
- Only the standalone year 2026 is allowed
- If any year other than 2026 appears in the output, regenerate the entire response

GOAL:
- Assume the reader already searched for this product
- Confirm they are evaluating it seriously
- Clarify key information before final purchase
- Reduce hesitation with reassurance
- Reinforce authenticity and official purchase channels
- Encourage moving forward confidently
- Do NOT create artificial urgency

DECISION PSYCHOLOGY (IMPORTANT):
- Speak to someone close to completing a purchase
- Validate their research effort
- Emphasize clarity, transparency, and informed choice
- Position the product as a structured and legitimate option
- Encourage accessing the official source naturally
- Avoid hype or aggressive persuasion

COMPLIANCE (Google Ads Search Safe):
- DO NOT make absolute promises
- DO NOT guarantee results
- DO NOT claim medical cures or diagnoses
- Avoid exaggerated or sensational language
- Do NOT imply treatment, prevention, or medical outcomes
- Keep claims factual and restrained
- Use cautious language (e.g. "may support", "designed to help", "according to the manufacturer")
- Avoid unrealistic performance claims
- Do NOT reference limited-time offers or discounts

TONE:
- Direct
- Confident (but not absolute)
- Structured
- Reassuring
- Informative with subtle authority

STYLE GUIDELINES:
- You MAY include subtle emojis at the beginning of SHORT confirmation lines
- Emojis must be subtle and informative (e.g. ✅ 📦 🔒 🧪)
- Do NOT overuse emojis
- Do NOT include emojis inside long paragraphs
- Avoid sounding like a sales page
- Maintain a review-style structure

PERSUASION BALANCE:
- Keep approximately 70–80% informational tone
- Allow 20–30% subtle persuasion through reassurance and clarity
- Focus on risk reduction rather than excitement

OUTPUT FORMAT:
Return ONLY valid JSON.
ALL keys below MUST exist.
ALL values MUST be strings.
If unsure, return an empty string "" — NEVER omit a key.

{
  "SITE_BRAND": "",
  "UPDATED_DATE": "",

  "HEADLINE_MAIN": "",
  "SUBHEADLINE_MAIN": "",
  "DECISION_STAGE_LINE": "",
  "POSITIONING_STATEMENT": "",

  "PRIMARY_PROBLEM_TITLE": "",
  "PRIMARY_PROBLEM_TEXT": "",

  "WHY_DIFFERENT_TITLE": "",
  "WHY_DIFFERENT_1": "",
  "WHY_DIFFERENT_2": "",
  "WHY_DIFFERENT_3": "",

  "MECHANISM_TITLE": "",
  "MECHANISM_STEP_1": "",
  "MECHANISM_STEP_2": "",
  "MECHANISM_STEP_3": "",

  "FORMULA_TEXT": "",
  "INGREDIENT_IMAGES": "",

  "WHO_SHOULD_USE_TITLE": "",
  "WHO_SHOULD_1": "",
  "WHO_SHOULD_2": "",
  "WHO_SHOULD_3": "",

  "WHO_SHOULD_NOT_TITLE": "",
  "WHO_NOT_1": "",
  "WHO_NOT_2": "",
  "WHO_NOT_3": "",

  "SCAM_ALERT_TITLE": "",
  "SCAM_ALERT_TEXT": "",

  "TESTIMONIAL_TITLE": "",
  "TESTIMONIAL_NOTICE_TEXT": "",
  "TESTIMONIAL_CTA_TEXT": "",

  "BONUS_TITLE": "",
  "BONUS_IMAGES": "",

  "GUARANTEE_TITLE": "",
  "GUARANTEE_TEXT": "",
  "GUARANTEE_IMAGE": "",

  "DISCLAIMER_TEXT": "",
  "FOOTER_DISCLAIMER": "",

  "CTA_BUTTON_TEXT": "",

  "PRIVACY_URL": "",
  "TERMS_URL": "",
  "CONTACT_URL": ""
}

Do not include HTML.
Do not include explanations outside JSON.
`;
};