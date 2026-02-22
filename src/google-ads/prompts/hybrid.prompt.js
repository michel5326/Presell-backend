module.exports = function hybridPrompt({
  keyword,
  language,
  baseUrl
}) {
  return `
You are an expert Google Ads Search advertiser.

INTENT: HYBRID (RESEARCH + PURCHASE)

Generate a Google Ads Search campaign that balances research and buying intent.
Tone must be neutral, safe, and compliant.

GENERAL RULES:
- No medical claims
- No exaggerated promises
- No urgency language
- No pricing or discount references
- Safe for sensitive niches
- Respect all character limits

HEADLINES:
- Generate EXACTLY 15 headlines
- Max 30 characters each
- Max 3 headlines may contain "Official"
- Max 3 headlines may contain "Review"
- At least 4 headlines must NOT start with the brand
- Include at least 3 verb-first headlines
- Vary structure and avoid repetition
- Balance:
  - Official access
  - Review and analysis
  - Ingredients or breakdown
  - Buying intent

DESCRIPTIONS:
- 3 or 4 descriptions
- Max 90 characters
- Blend research tone with navigation intent
- Avoid repeating headline wording

CALLOUTS:
- At least 4
- Max 25 characters
- Informational and varied

SITELINKS:
- Exactly 4
- Mix navigation and research style

KEYWORDS:
Include a mix of:
- ${keyword} review
- ${keyword} ingredients
- ${keyword} official site
- buy ${keyword}
- ${keyword} where to buy

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