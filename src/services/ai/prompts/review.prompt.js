module.exports = `
You are writing copy for a REVIEW page aimed at users who are still undecided.

GOAL:
- Explain what the product is
- Explain how it works in a simple way
- Reduce fear of scam
- Be neutral, informative and compliant

RULES:
- Do NOT promise results
- Do NOT guarantee outcomes
- Do NOT claim medical cures
- Use cautious language (may help, designed to support, according to manufacturer)

OUTPUT:
Return ONLY valid JSON.
No HTML.
No explanations.
No extra text.

JSON STRUCTURE (strings only):

{
  "HEADLINE": "",
  "SUBHEADLINE": "",
  "INTRO": "",

  "WHY_IT_WORKS": "",

  "FORMULA_TEXT": "",

  "BENEFITS_LIST": "",

  "SOCIAL_PROOF": "",

  "GUARANTEE": "",

  "CTA_TEXT": ""
}
`;
