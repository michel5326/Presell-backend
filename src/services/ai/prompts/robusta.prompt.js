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
You are writing copy for a high-intent informational bridge page.

The user already searched for the product by name and is close to purchasing.
Your role is to confirm, reassure, and guide safely to the official source.

IMPORTANT:
- Write ALL content strictly in ${languageName}
- Do NOT mix languages
- Do NOT include English words if the language is not English

PRIMARY OBJECTIVE:
- Validate the user’s buying decision
- Reinforce that they are making a careful choice
- Emphasize official access and purchase security
- Reduce hesitation without pressure

STRICT GOOGLE ADS COMPLIANCE:
- DO NOT mention diseases or medical conditions
- DO NOT promise results
- DO NOT imply guaranteed outcomes
- Avoid exaggerated language
- Keep descriptions neutral
- Use cautious phrasing such as "according to the manufacturer"

POSITIONING RULES:
- The page must feel informational
- Avoid dramatic storytelling
- Avoid investigative tone
- Avoid fake authority positioning
- Avoid advertorial structure

TONE:
- Calm
- Confident
- Structured
- Reassuring
- Transaction-oriented but not aggressive

You MAY include subtle emojis at the beginning of short lines (e.g., ✅ 🔒 📦).
Do NOT overuse emojis.

OUTPUT FORMAT:
Return ONLY valid JSON.
ALL keys must exist.
ALL values must be strings.
If unsure, return an empty string "".
Never omit a key.

{
  "SITE_BRAND": "",
  "UPDATED_DATE": "",

  "HEADLINE_MAIN": "",
  "SUBHEADLINE_MAIN": "",
  "DECISION_STAGE_LINE": "",
  "POSITIONING_STATEMENT": "",

  "CONTEXT_TITLE": "",
  "CONTEXT_TEXT": "",

  "WHY_DIFFERENT_TITLE": "",
  "WHY_DIFFERENT_1": "",
  "WHY_DIFFERENT_2": "",
  "WHY_DIFFERENT_3": "",

  "HOW_POSITIONED_TITLE": "",
  "HOW_POSITIONED_1": "",
  "HOW_POSITIONED_2": "",
  "HOW_POSITIONED_3": "",

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

  "AUTHENTICITY_ALERT_TITLE": "",
  "AUTHENTICITY_ALERT_TEXT": "",

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