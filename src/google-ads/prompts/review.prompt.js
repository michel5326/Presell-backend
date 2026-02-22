module.exports = function reviewPrompt({
  keyword,
  language,
  baseUrl
}) {
  return `
You are an expert Google Ads Search advertiser.

INTENT: REVIEW / RESEARCH

Generate a Google Ads Search campaign focused on analytical and research intent.
The tone must feel independent and informational.

GENERAL RULES:
- No medical claims
- No exaggerated promises
- No urgency
- No pricing language
- Safe for sensitive niches
- Respect all character limits

HEADLINES:
- Generate EXACTLY 15 headlines
- Max 30 characters each
- At least 4 headlines must NOT start with the brand
- Max 3 headlines may contain the word "Review"
- Max 2 headlines may contain "Analysis"
- Vary structure (brand-first, verb-first, context-first)
- Focus on:
  - Breakdown
  - Ingredients
  - Evaluation
  - Findings
  - Insights
  - User feedback

DESCRIPTIONS:
- 3 or 4 descriptions
- Max 90 characters
- Focus on research and evaluation tone

CALLOUTS:
- At least 4
- Max 25 characters
- Informational only

SITELINKS:
- Exactly 4
- Neutral research style

KEYWORDS:
Focus on:
- ${keyword} review
- ${keyword} ingredients
- ${keyword} analysis
- ${keyword} breakdown
- ${keyword} research

Return ONLY valid JSON.
`;
};