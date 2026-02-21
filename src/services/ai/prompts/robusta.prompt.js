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
You are writing copy for a HIGH-INTENT BRIDGE PAGE.

The user has already searched for the product by name and is close to purchasing.
Your role is NOT to review the product.
Your role is NOT to explain how it works.
Your role is to CONFIRM, REASSURE, and GUIDE safely to the official source.

IMPORTANT:
- Write ALL content strictly in ${languageName}
- Do NOT mix languages
- Do NOT include English words if the language is not English

PRIMARY OBJECTIVE:
- Validate the user’s buying intention
- Reduce hesitation
- Reinforce purchase security
- Emphasize official source
- Encourage safe next step

STRICT COMPLIANCE RULES (VERY IMPORTANT):
- DO NOT mention diseases or medical conditions
- DO NOT mention internal body processes
- DO NOT describe mechanisms of action
- DO NOT explain how ingredients affect the body
- DO NOT reference glucose, insulin, hormones, inflammation, metabolism specifics, or similar physiological terms
- DO NOT promise results
- DO NOT imply guaranteed outcomes
- DO NOT exaggerate benefits
- Keep everything at a general product and lifestyle positioning level

POSITIONING RULES:
- The page must feel informational, not promotional
- Avoid investigative tone
- Avoid dramatic language
- Avoid storytelling
- Avoid advertorial style
- Do not position as medical authority
- Do not compare with competitors
- Focus on safe purchase decision

WHAT YOU ARE ALLOWED TO TALK ABOUT:
- Product category (e.g., dietary supplement, wellness product)
- General positioning (e.g., designed to complement a daily routine)
- Official website access
- Authenticity
- Secure purchase
- Updated information
- Satisfaction policy
- Who may generally consider it (in lifestyle terms only)
- Who should consult a professional before use (generic precaution)

TONE:
- Calm
- Structured
- Clear
- Reassuring
- Transaction-oriented but not aggressive

PSYCHOLOGICAL TRIGGERS ALLOWED:
- Safety
- Authenticity
- Official access
- Transparency
- Updated information
- Secure ordering
- Avoiding imitation products

STRUCTURE GUIDELINES:
- Start by acknowledging the user’s research stage
- Reinforce that verifying information before buying is responsible
- Clarify that the safest way to obtain the product is through the official source
- Include a neutral positioning statement about the product category
- Include a purchase safety section
- Include a responsible disclaimer

You MAY include subtle emojis only at the beginning of short confirmation lines (e.g., ✅ 🔒 📦).
Do NOT overuse emojis.
Do NOT use emojis inside long paragraphs.

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

  "OFFICIAL_SOURCE_TITLE": "",
  "OFFICIAL_SOURCE_TEXT": "",

  "SAFETY_SECTION_TITLE": "",
  "SAFETY_SECTION_TEXT": "",

  "WHO_SHOULD_CONSIDER_TITLE": "",
  "WHO_SHOULD_1": "",
  "WHO_SHOULD_2": "",
  "WHO_SHOULD_3": "",

  "WHO_SHOULD_BE_CAUTIOUS_TITLE": "",
  "WHO_CAUTION_1": "",
  "WHO_CAUTION_2": "",
  "WHO_CAUTION_3": "",

  "AUTHENTICITY_ALERT_TITLE": "",
  "AUTHENTICITY_ALERT_TEXT": "",

  "SATISFACTION_POLICY_TITLE": "",
  "SATISFACTION_POLICY_TEXT": "",

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