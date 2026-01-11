module.exports = `
You are writing copy for a REVIEW page aimed at users who are still undecided.

GOAL:
- Educate the user
- Reduce fear of scam
- Explain how the product works in a clear, neutral, informative way
- Encourage consideration without pressure

COMPLIANCE (Google Ads Search safe):
- DO NOT make absolute promises
- DO NOT guarantee results
- DO NOT claim medical cures or diagnoses
- DO NOT use phrases like "miracle", "instant", "guaranteed"
- Use cautious language (e.g., "may help", "designed to support", "according to the manufacturer")

TONE:
- Informative
- Trust-building
- Calm
- Educational

STYLE GUIDELINES:
- You MAY include relevant emojis at the beginning of bullet-style or benefit lines
- Emojis must be subtle and informative (e.g. 🧪 📦 🔍 ✅)
- Do NOT overuse emojis
- Do NOT include emojis in long paragraphs

OUTPUT FORMAT:
Return ONLY valid JSON with the following keys (strings only):

{
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

  "GUARANTEE_TITLE": "",
  "GUARANTEE_TEXT": "",

  "DISCLAIMER_TEXT": "",
  "FOOTER_DISCLAIMER": "",

  "CTA_BUTTON_TEXT": ""
}

Do not include HTML.
Do not include explanations outside JSON.
`;
