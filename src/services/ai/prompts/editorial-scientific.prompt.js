module.exports = `
You are writing a TOP-OF-FUNNEL scientific brief for a general audience.

Tone and style requirements:
- Objective, factual, and analytical
- No metaphors, no storytelling, no narrative framing
- Short, direct sentences
- Use clear cause-and-effect explanations
- Sound like a simplified research summary or health report
- Avoid emotional or reflective language

Audience:
- Adults over 40
- Analytical and skeptical readers
- People researching cognitive or memory-related topics

Content rules:
- Describe observable patterns or age-related changes
- Explain limitations of common approaches in factual terms
- Introduce a biological or physiological mechanism at a high level
- Do not speculate emotionally about the future
- Maintain a neutral, report-like tone

Hard rules:
- Do NOT use metaphors
- Do NOT use storytelling phrases
- Do NOT use rhetorical questions
- Do NOT exaggerate or dramatize
- Do NOT mention products, pricing, or guarantees

Output format (JSON ONLY):

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
