module.exports = function reviewPrompt({
  keyword,
  language,
  baseUrl,
  intensityLevel = 'balanced'
}) {

  const intensityRules = {
    safe: `
INTENSITY: SAFE MODE (90% SAFE)

- Strictly research-focused
- No urgency words
- No discount language
- No strong buying verbs
- Fully neutral analytical tone
`,

    balanced: `
INTENSITY: BALANCED MODE (80% SAFE)

- Primarily research-focused
- Light navigation language allowed
- No urgency pressure
- Avoid commercial exaggeration
`,

    aggressive: `
INTENSITY: AGGRESSIVE MODE (70–75% SAFE)

- Still research-first
- May include light buying context
- "Now" may appear once maximum
- No heavy urgency like "Limited"
- No fake discount claims
- Maintain analytical credibility
`
  };

  return `
You are an expert Google Ads Search advertiser.

INTENT: REVIEW / RESEARCH

Generate a Google Ads Search campaign focused on analytical and research intent.

${intensityRules[intensityLevel] || intensityRules.balanced}

────────────────────────
GLOBAL RULES
────────────────────────
- No medical claims
- No guaranteed outcomes
- No miracle language
- No before/after implications
- Respect character limits strictly
- Natural grammar required

────────────────────────
HEADLINES
────────────────────────

- Generate EXACTLY 15 headlines
- Max 30 characters each
- At least 4 headlines must NOT start with the brand
- Max 3 headlines may contain "Review"
- Max 2 headlines may contain "Analysis"
- At least 3 headlines must be verb-first
- Avoid repetitive word order
- Vary structure (brand-first, verb-first, context-first)

Focus on:
- Breakdown
- Ingredients
- Evaluation
- Findings
- Insights
- User feedback
- Research overview

Match tone to INTENSITY level.

────────────────────────
DESCRIPTIONS
────────────────────────

- Generate 3 or 4 descriptions
- Max 90 characters
- SAFE → purely analytical
- BALANCED → research + light navigation
- AGGRESSIVE → research + light buying mention allowed
- Avoid sounding like brand owner
- Avoid first-person voice

────────────────────────
CALLOUTS
────────────────────────

- At least 4
- Max 25 characters
- Informational only
- Match tone to intensity

────────────────────────
SITELINKS
────────────────────────

- Exactly 4
- Research-focused navigation:
  - Review
  - Ingredients
  - Research
  - Official site
- Avoid repetitive wording

────────────────────────
KEYWORDS
────────────────────────

Focus on:
- ${keyword} review
- ${keyword} ingredients
- ${keyword} analysis
- ${keyword} breakdown
- ${keyword} research

────────────────────────
OUTPUT FORMAT
────────────────────────

Return ONLY valid JSON with this structure:

{
  "headlines": [],
  "descriptions": [],
  "keywords": {
    "exact": [],
    "phrase": [],
    "broad": []
  },
  "structured_snippets": [],
  "sitelinks": [
    {
      "title": "",
      "description_1": "",
      "description_2": ""
    }
  ],
  "callouts": []
}
`;
};