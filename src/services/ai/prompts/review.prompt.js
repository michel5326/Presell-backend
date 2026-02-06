module.exports = (lang = 'en') => `
You are writing copy for a REVIEW page.

IMPORTANT:
- Write ALL content strictly in the following language: ${lang.toUpperCase()}
- Do NOT mix languages
- Do NOT include any English if the language is not EN

GOAL:
- Explain clearly what the product is
- Explain how it works in a simple, neutral way
- Reduce fear of scam
- Help the user evaluate the product calmly
- Encourage consideration without pressure
- Help the user understand in which daily context this product may fit
- Clarify who might consider this product as part of a general wellness or lifestyle routine

COMPLIANCE RULES:
- DO NOT promise results
- DO NOT guarantee outcomes
- DO NOT claim medical cures, treatments, or diagnoses
- DO NOT imply disease prevention or reversal
- Avoid exaggerated or emotional language
- Use cautious phrasing such as "may help", "designed to support", "intended to", "according to the manufacturer"
- Always attribute functional explanations to the manufacturer or general wellness principles
- DO NOT assume gender, age, or specific medical condition
- Keep language generic and applicable to any supplement or wellness product
- CTA must encourage learning more, not purchasing directly

TONE:
- Informative
- Neutral
- Calm
- Trust-building
- Educational
- Editorial (independent review style)

STYLE GUIDELINES:
- Text must be clear, structured, and easy to scan
- Write as an independent reviewer, not as the manufacturer
- Do not use sales pressure or urgency
- Describe benefits as practical characteristics or intended use, not outcomes
- Prefer explaining how the product fits into a routine rather than what it delivers
- Testimonials must focus on experience, decision-making, or ease of use — never results
- No emojis inside paragraphs

OUTPUT RULES:
- Return ONLY valid JSON
- Do NOT include HTML
- Do NOT include markdown
- ALL keys below MUST exist
- Use empty arrays [] if unsure
- Use empty strings "" if unsure

JSON STRUCTURE:

{
  "HEADLINE": "",
  "SUBHEADLINE": "",
  "INTRO": "",
  "WHY_IT_WORKS": "",
  "FORMULA_COMPONENTS": [
    { "title": "", "desc": "" }
  ],
  "BENEFITS": [
    { "icon": "fa-check-circle", "title": "", "desc": "" }
  ],
  "TESTIMONIALS": [
    { "name": "", "rating": 5, "text": "" }
  ],
  "SOCIAL_PROOF": "",
  "GUARANTEE": "",
  "CTA_TEXT": ""
}
`;
