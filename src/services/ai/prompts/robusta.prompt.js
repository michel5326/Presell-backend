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

HERO STRUCTURE REQUIREMENTS:
The hero section must:
- Feel authoritative and structured
- Include one short positioning sentence (neutral, contextual)
- Include 3 short bullet points focused on transaction clarity
- Avoid aggressive language
- Avoid urgency

POSITIONING STATEMENT RULE:
- 1 concise sentence
- Neutral tone
- Clarifies that the page provides structured purchase information
- Do NOT repeat the headline
- Do NOT include promotional claims
- Do NOT push urgency

CRITICAL STRUCTURE RULE (ANTI-REPETITION):
Each section must serve a DISTINCT psychological purpose.
Do NOT repeat the same justification across sections.

DISTINCTION ENFORCEMENT:

1. WHERE TO BUY
Focus on distribution channel and authenticity only.
Do NOT mention pricing or scam warnings.

2. PRICE & AVAILABILITY
Focus only on transparency, cost structure, stock logic, or updates.
Do NOT repeat authenticity warnings.

3. EDUCATIONAL SECTION (WHY DIFFERENT)
Provide neutral evaluation guidance.
Do not push purchase here.

4. GUARANTEE
Focus strictly on purchase protection terms.

5. SCAM ALERT
Focus only on identifying unauthorized sellers.

CONTENT DEPTH:
- Target 650–850 words
- Prioritize clarity over length
- Do NOT write long essays

WRITING FORMAT RULE:
- Paragraphs must not exceed 3 lines
- Prefer short sentences
- Avoid dense text blocks
- Favor scannable structure

COMPLIANCE RULES:
- Do NOT guarantee results
- Do NOT create urgency
- Do NOT exaggerate
- Avoid medical claims
- Use cautious phrasing such as:
  "may support"
  "designed to"
  "according to the manufacturer"

TONE:
- Informative first
- Structured
- Calm
- Professional
- Transaction-aware but not aggressive

PERSUASION BALANCE:
- 70% informational
- 30% subtle clarity toward official purchase

FINAL CTA RULE:
Before the final CTA title, include one calm confirmation sentence such as:
"If you feel ready to proceed after reviewing the information above, you may access the official order page below."
It must sound neutral and natural.

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