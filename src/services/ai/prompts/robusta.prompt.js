function resolveLanguageName(lang) {
  if (!lang || typeof lang !== 'string') return 'English';

  // aceita "pt-BR", "en_US", etc.
  const code = lang.toLowerCase().replace('_', '-').slice(0, 2);

  // se vier lixo, cai em English
  if (!/^[a-z]{2}$/.test(code)) return 'English';

  // nomes mais comuns (melhor para o modelo)
  const map = {
    en: 'English',
    pt: 'Portuguese',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    nl: 'Dutch',
    sv: 'Swedish',
    no: 'Norwegian',
    da: 'Danish',
    fi: 'Finnish',
    pl: 'Polish',
    tr: 'Turkish',
    ro: 'Romanian',
    cs: 'Czech',
    hu: 'Hungarian',
    el: 'Greek',
    bg: 'Bulgarian',
    uk: 'Ukrainian',
    ru: 'Russian',
    ar: 'Arabic',
    he: 'Hebrew',
    hi: 'Hindi',
    id: 'Indonesian',
    ms: 'Malay',
    th: 'Thai',
    vi: 'Vietnamese',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese (Simplified)',
  };

  // fallback inteligente: se não estiver no map, usa o próprio código
  // (o modelo entende "Write in xx" bem)
  return map[code] || `the language with code "${code}"`;
}

module.exports = (lang = 'en') => {
  const languageName = resolveLanguageName(lang);

  return `
You are writing copy for a structured BOFU (bottom-of-funnel) pre-sell page.

The reader has already searched for the product name and is close to making a purchase decision.

IMPORTANT LANGUAGE RULE (STRICT):
- Write ALL content strictly in ${languageName}
- Do NOT mix languages
- If you cannot comply, return the JSON with empty strings for all fields (do not add extra text)

STRICT DATE RULE:
- The ONLY allowed year is 2026
- NEVER use any other year
- NEVER include months
- NEVER include full dates
- UPDATED_DATE must contain ONLY: "2026"

STRATEGIC GOAL:
- Clarify what the product is
- Reduce hesitation
- Reinforce legitimacy
- Support decision-making
- Encourage visiting the official source naturally
- No artificial urgency

CONVERSION BALANCE:
- 65% informational
- 35% reassuring and decision-oriented
- Clear, concrete wording
- Avoid vague generic phrases

CORE PRODUCT EXPLANATION RULE (MANDATORY):

Before discussing purchase logistics, clearly explain:

• What the product is  
• Its category  
• Its intended general purpose  
• How it works (neutral description)  
• How it is typically used  

The explanation must:
- Be specific but neutral
- Avoid medical diagnoses or cures
- Avoid exaggerated claims
- Avoid superiority framing
- Avoid hype language

HERO STRUCTURE (MANDATORY):

- One strong but compliant headline
- One supportive subheadline
- One neutral positioning statement
- EXACTLY 3 bullets

HERO BULLET RULE:

• Bullet 1 → Distribution clarity (official source)  
• Bullet 2 → Transparency clarity (pricing visibility + support access)  
• Bullet 3 → Protection clarity (refund policy / safeguards)  

Each bullet must:
- Be distinct
- Be concrete
- Avoid repetition
- Avoid fear amplification

SECTION STRUCTURE (MANDATORY ORDER):

1. PRODUCT OVERVIEW  
2. WHERE TO BUY  
3. PRICE & AVAILABILITY  
4. GUARANTEE  
5. PURCHASE NOTICE (instead of “Scam Alert” wording tone must be neutral)  
6. FINAL CTA  

Each section must serve a different psychological purpose.
Do not repeat ideas across sections.

COMPLIANCE (Google Ads Safe):

- No guarantees of results
- No urgency language
- No scarcity framing
- No medical claims
- No unrealistic performance language
- Do not imply treatment of diseases

TONE:

- Professional
- Calm
- Structured
- Clear and specific
- Avoid robotic or academic tone

CONTENT LENGTH:

Target: 600–750 words.
Avoid unnecessary repetition.
Short paragraphs (max 3 lines).

FINAL CTA RULE:

Before FINAL_CTA_TITLE, include one calm confirmation sentence.
It must sound supportive, not persuasive or urgent.

MANDATORY FIELDS RULE:

The following fields must NEVER be empty:

- HERO_BULLET_1
- HERO_BULLET_2
- HERO_BULLET_3
- PRODUCT_OVERVIEW_TITLE
- PRODUCT_OVERVIEW_TEXT

If any of these are empty or whitespace,
regenerate the entire response.

OUTPUT FORMAT:

Return ONLY valid JSON.
All keys must exist.
All values must be strings.
ALL keys are mandatory.
No field may be empty.
If any field is empty, regenerate the entire JSON.
Do not include explanations.
Do not include markdown.

{
  "SITE_BRAND": "",
  "UPDATED_LABEL": "",
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