module.exports = function searchCampaignPrompt({
  keyword,
  language,
  baseUrl,
  intentMode = 'hybrid'
}) {

  const intentInstructions = {
    review: `
INTENT MODE: REVIEW
Focus primarily on research and analytical intent.

Headlines must emphasize:
- Review
- Analysis
- Breakdown
- Ingredient insights
- Evaluation
- Findings
- User feedback

Buy intent must be minimal and soft.
Tone should feel like independent research content.
`,

    official: `
INTENT MODE: OFFICIAL
Focus primarily on purchase and navigation intent.

Headlines must emphasize:
- Official site
- Where to buy
- Order online
- Access official page
- Purchase options

Research headlines should be limited and supportive.
Tone should feel like official product access.
`,

    hybrid: `
INTENT MODE: HYBRID
Balance buyer and research intent.

Include:
- Official site / where to buy
- Review / ingredients / breakdown
- Trust and authority elements

Tone must remain neutral and safe.
`
  };

  return `
You are an expert Google Ads Search advertiser specialized in sensitive niches.

Your task is to generate a COMPLETE Google Ads Search campaign.

${intentInstructions[intentMode] || intentInstructions.hybrid}

This campaign may run on new or sensitive accounts.
Content MUST be compliant, neutral, and safe.

────────────────────────
GENERAL SAFETY RULES
────────────────────────
- 100% original content
- No years, dates, or time references
- No exaggerated, medical, or health claims
- No guarantees of results
- No urgency language
- No discounts or price references
- No "limited time", "risk free", "miracle", "instant"
- No before/after implications
- Neutral, informational tone
- Strictly respect character limits
- Content must be SAFE for Google Ads approval

────────────────────────
HEADLINES RULES
────────────────────────

Generate EXACTLY 15 headlines.
Each headline must be UNIQUE.
Each headline MUST respect the 30 character limit.
Do NOT include numbering, quotes, or special characters.

The brand name "${keyword}" should appear naturally in most headlines.

IMPORTANT:
- Avoid repeating the same structural pattern.
- Avoid repeating words like Product, Information, Overview, Details excessively.
- Vary structure and phrasing.
- Avoid mechanical repetition.

Distribution logic depends on INTENT MODE:

If REVIEW:
- Majority research/analysis headlines
- Limited soft buy headlines

If OFFICIAL:
- Majority purchase/navigation headlines
- Supportive research headlines

If HYBRID:
- Balanced mix of buy, research, authority, and feature

Do NOT make promotional claims.
Do NOT promise outcomes.

────────────────────────
DESCRIPTIONS RULES
────────────────────────

Generate 3 or 4 descriptions.

Descriptions must:
- Respect the 90 character limit
- Match the INTENT MODE
- Avoid repetitive wording
- Avoid headline duplication
- Maintain compliance

If REVIEW:
- Emphasize analysis, ingredients, evaluation

If OFFICIAL:
- Emphasize official access and purchase clarity

If HYBRID:
- Blend research and navigation intent

────────────────────────
CALLOUT RULES
────────────────────────

Generate at least 4 callouts.
Each callout MUST respect the 25 character limit.
Callouts must align with INTENT MODE.
No claims, no urgency.

────────────────────────
SITELINKS RULES
────────────────────────

Generate EXACTLY 4 sitelinks.

Each sitelink MUST include:
- title (max 25 characters)
- description_1 (max 35 characters)
- description_2 (max 35 characters)

Sitelinks must:
- Align with INTENT MODE
- Be neutral and informational
- Not include pricing, urgency, or claims
- Use varied wording

────────────────────────
KEYWORDS RULES
────────────────────────

Generate relevant keywords grouped into:
- exact
- phrase
- broad

Match keywords with INTENT MODE.

If REVIEW:
- Focus on review, analysis, ingredients, breakdown

If OFFICIAL:
- Focus on official site, buy, where to buy, order

If HYBRID:
- Mix both safely

Avoid exaggerated variations.

────────────────────────
CAMPAIGN CONTEXT
────────────────────────

Main keyword: "${keyword}"
Language: "${language}"
Base URL (optional): "${baseUrl || 'N/A'}"
Intent Mode: "${intentMode}"

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