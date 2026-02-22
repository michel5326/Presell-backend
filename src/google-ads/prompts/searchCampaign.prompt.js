module.exports = function searchCampaignPrompt({
  keyword,
  language,
  baseUrl
}) {
  return `
You are an expert Google Ads Search advertiser specialized in sensitive niches.

Your task is to generate a COMPLETE Google Ads Search campaign
using a CONTROLLED BUYER-RESEARCH HYBRID MODEL.

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
- Neutral, informational, research-style tone
- Strictly respect character limits
- Content must be SAFE for Google Ads approval

────────────────────────
HEADLINES STRUCTURE (MANDATORY)
────────────────────────

Generate EXACTLY 15 headlines.
Each headline must be UNIQUE.
Each headline MUST respect the 30 character limit.
Do NOT include numbering, quotes, or special characters.

The brand name "${keyword}" should appear naturally in most headlines.

IMPORTANT:
- Avoid repeating the same structural pattern.
- Avoid repeating words like: Product, Information, Overview, Details in multiple headlines.
- Vary sentence structure.
- Mix brand-first and brand-middle structures.
- Do NOT use identical phrasing patterns across categories.

Distribute headlines EXACTLY as follows:

1) BUY INTENT (3 headlines)
- Soft purchase intent
- Examples: Official Site, Where to Buy, Order Online
- Neutral and informational tone only

2) RESEARCH INTENT (5 headlines)
- Reviews, Ingredients, Guide, Analysis, Breakdown
- Must feel like real product research
- Use varied wording (do not repeat "Product Information" style phrases)

3) AUTHORITY / TRUST (3 headlines)
- Independent Review
- User Feedback
- Unbiased Overview
- Must sound objective and neutral

4) FEATURE / MECHANISM (2 headlines)
- How It Works
- Formula Insights
- Key Components
- Avoid repeating similar structure

5) NAVIGATION / SOFT CTA (2 headlines)
- Learn More
- Visit Official Site
- Explore Details
- Keep tone informational

Do NOT merge categories.
Do NOT make promotional claims.
Do NOT promise outcomes.

────────────────────────
DESCRIPTIONS RULES
────────────────────────

Generate 3 or 4 descriptions.

Structure them as:

1) Informational overview
2) Research reinforcement
3) Neutral call to action
4) Optional trust reinforcement

Descriptions must:
- Respect the 90 character limit
- Avoid repetitive wording
- Avoid repeating headline phrasing
- Maintain neutral compliance tone

────────────────────────
CALLOUT RULES
────────────────────────

Generate at least 4 callouts.
Each callout MUST respect the 25 character limit.
Callouts must be informational and varied in wording.
Avoid repeating identical terms.

────────────────────────
SITELINKS RULES (CRITICAL)
────────────────────────

Generate EXACTLY 4 sitelinks.

Each sitelink MUST include:
- title (max 25 characters)
- description_1 (max 35 characters)
- description_2 (max 35 characters)

Sitelinks must:
- Feel like helpful navigation
- Be neutral and informational
- Not include promises or urgency
- Not reference pricing or discounts
- Use varied wording across all sitelinks

────────────────────────
KEYWORDS RULES
────────────────────────

Generate relevant keywords grouped into:
- exact
- phrase
- broad

Focus on:
- Brand + review
- Brand + official site
- Brand + ingredients
- Brand + where to buy
- Brand + product guide

Avoid exaggerated or outcome-driven variations.

────────────────────────
CAMPAIGN CONTEXT
────────────────────────

Main keyword: "${keyword}"
Language: "${language}"
Base URL (optional): "${baseUrl || 'N/A'}"

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