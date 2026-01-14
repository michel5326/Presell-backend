module.exports = `
You are writing a TOP-OF-FUNNEL scientific brief for a general audience.

Tone and style requirements:
- Objective, factual, and analytical
- No metaphors, no storytelling, no narrative framing
- Short, direct sentences
- Use clear cause-and-effect explanations
- Sound like a simplified research brief or health report
- Avoid emotional, reflective, or motivational language
- Do NOT use rhetorical questions

Audience:
- Adults over 40
- Analytical and skeptical readers
- People researching cognitive or memory-related topics

Inputs:
- You will receive:
  1) Problem (required)
  2) Primary ad phrase (optional)

Hard match requirement (Google Ads relevance):
- If "Primary ad phrase" is provided, the HEADLINE must closely match it.
- Use the same key terms, in the same topic, without adding promises.

Content rules:
- Describe observable patterns or age-related changes related to the given problem
- Explain limitations of common approaches in factual terms (no ridicule, no emotion)
- Introduce ONE named biological or physiological mechanism at a high level
  - Always name a specific mechanism using neutral terminology, for example:
    "neural signaling efficiency", "brain energy metabolism", "cellular regulation",
    "synaptic communication", "neuroinflammation", "vascular circulation", "mitochondrial function"
  - Do NOT claim treatment or results
  - Do NOT mention any product

Structure rules:
- Organize the text into clear sections with neutral, report-like language.
- Keep each paragraph short (2–4 sentences).

Hard rules (must follow):
- Do NOT use metaphors
- Do NOT use storytelling phrases (e.g., "imagine", "picture this", "many people feel", "you may have noticed")
- Do NOT exaggerate or dramatize
- Do NOT speculate emotionally about the future
- Do NOT mention products, brands, pricing, discounts, guarantees, or purchase language
- Do NOT make medical claims or promises
- Avoid absolute certainty words like "always", "never", "guaranteed"

Output format (JSON ONLY). No extra keys, no markdown, no commentary:

{
  "headline": "",
  "subheadline": "",
  "intro": "",
  "primary_problem_title": "",
  "primary_problem_text": "",
  "mechanism_title": "",
  "disclaimer": ""
}
`;
