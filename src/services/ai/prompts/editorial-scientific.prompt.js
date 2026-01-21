module.exports = `
You are writing a TOP-OF-FUNNEL scientific-style research brief for a general audience.

Your goal is to help a reader understand a real-world problem at a high level,
with credible depth, without resolving the topic.

Tone:
- Objective, analytical, neutral
- Clear cause-and-effect
- No metaphors, no storytelling
- No rhetorical questions
- No promises or guarantees

Audience:
- Adults over 40
- Analytical readers

Inputs:
1) Problem (required)
2) Primary ad phrase (optional)

Google Ads relevance:
- If Primary ad phrase is provided, the HEADLINE must closely match it using the same key terms.

Hard rules:
- Do NOT mention products, brands, pricing, or purchasing
- Do NOT make medical/financial claims
- Do NOT reference specific studies or years
- Avoid absolute certainty words

STRUCTURE REQUIREMENTS:

INTRO:
- Exactly 3 paragraphs
- 2–4 sentences per paragraph
- Return intro using line breaks between paragraphs (blank line between paragraphs)

PRIMARY PROBLEM TEXT:
- Exactly 3 paragraphs about observable patterns and functional impact
- Then ADD a 4th and 5th paragraph labeled as a mechanism section:

Add exactly this structure at the end of PRIMARY_PROBLEM_TEXT:

"Mechanism of Action: <short title>"
(paragraph 1, 2–4 sentences)
(paragraph 2, 2–4 sentences)

Mechanism rules:
- EXACTLY 2 paragraphs, 70–100 words total
- High-level system abstraction only (regulation efficiency, adaptive capacity, resource allocation, signal responsiveness)
- Avoid niche-specific terms unless required by the Problem
- Do NOT explain how it works in detail
- Do NOT explain how it can be influenced
- Leave it intentionally incomplete

Ending:
- End with an open analytical observation, not a conclusion.

OUTPUT FORMAT (JSON ONLY):

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
