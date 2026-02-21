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
You are writing copy for a structured BOFU (bottom-of-funnel) pre-sell page.

The reader has already searched for the product name and is close to making a purchase decision.

IMPORTANT LANGUAGE RULE:
- Write ALL content strictly in ${languageName}
- Do NOT mix languages
- Do NOT include English words if the language is not English

STRICT DATE RULE:
- The ONLY allowed year is 2026
- NEVER use any other year
- NEVER include months
- NEVER include full dates
- The UPDATED_DATE field must contain ONLY: "2026"

STRATEGIC GOAL:
- Clarify the product
- Reduce hesitation
- Confirm legitimacy
- Provide structured decision support
- Encourage accessing the official source naturally
- No artificial urgency

CORE PRODUCT EXPLANATION RULE (MANDATORY):

Before discussing purchasing logistics, you MUST clearly explain:

• What the product is  
• Its category  
• Its intended general purpose  
• How it works (in neutral, descriptive terms)  
• How it is typically used  

This explanation must:
- Be informational
- Avoid promises or guarantees
- Avoid exaggerated claims
- Avoid medical cures or diagnoses
- Avoid superiority framing
- Avoid hype

HERO STRUCTURE (MANDATORY):

- One structured headline
- One supportive subheadline
- One neutral positioning statement
- EXACTLY 3 bullets

HERO BULLET RULE:

• Bullet 1 → Distribution clarity (official source, channel logic)
• Bullet 2 → Transparency clarity (pricing structure, support access)
• Bullet 3 → Protection clarity (refund eligibility, safeguards)

Each bullet must introduce a distinct informational angle.
No repetition.
No fear amplification.

SECTION STRUCTURE (MANDATORY ORDER):

1. PRODUCT OVERVIEW  
2. WHERE TO BUY  
3. PRICE & AVAILABILITY  
4. GUARANTEE  
5. SCAM ALERT  
6. FINAL CTA  

Each section must serve a different psychological function.
No conceptual repetition across sections.

COMPLIANCE (Google Ads Safe):

- No guarantees of results
- No urgency
- No scarcity framing
- No medical claims
- No exaggerated benefits
- No unrealistic performance language

TONE:

- Professional
- Calm
- Structured
- Informational first
- 70% informational
- 30% subtle reassurance

FINAL CTA RULE:

Before the final CTA title, include one calm confirmation sentence.
It must sound neutral and supportive, not persuasive.

CONTENT LENGTH:
650–850 words.
Short paragraphs (max 3 lines).

MANDATORY FIELDS RULE (CRITICAL):

The following fields must NEVER be empty:

- HERO_BULLET_1
- HERO_BULLET_2
- HERO_BULLET_3
- PRODUCT_OVERVIEW_TITLE
- PRODUCT_OVERVIEW_TEXT

If any of these fields are empty, incomplete, or contain only whitespace,
you MUST regenerate the entire response.

Do NOT return empty strings for these fields under any circumstance.

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

  "HERO_BULLET_1": "",
  "HERO_BULLET_2": "",
  "HERO_BULLET_3": "",

  "PRODUCT_OVERVIEW_TITLE": "",
  "PRODUCT_OVERVIEW_TEXT": "",

  "WHERE_TO_BUY_TITLE": "",
  "WHERE_TO_BUY_TEXT": "",

  "PRICE_AVAILABILITY_TITLE": "",
  "PRICE_AVAILABILITY_TEXT": "",

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