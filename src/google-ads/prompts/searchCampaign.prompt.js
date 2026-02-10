module.exports = function searchCampaignPrompt({
  keyword,
  language,
  baseUrl
}) {
  return `
You are an expert Google Ads Search advertiser.

Your task is to generate a COMPLETE Google Ads Search campaign
using a HYBRID MODEL:
- Cognitive functions are FIXED
- Textual phrasing is VARIABLE

GENERAL RULES:
- 100% original content
- No years, dates, or time references
- No exaggerated or medical claims
- No guarantees of results
- Neutral, informational, review-style tone
- Strictly respect character limits
- Content must be SAFE for Google Ads approval

HEADLINES RULES (CRITICAL):
- Generate EXACTLY 15 headlines
- Each headline must be UNIQUE
- Do NOT return fewer than 15 headlines
- Each headline MUST respect the 30 character limit
- Do NOT include numbering, quotes, or special characters

DESCRIPTIONS RULES:
- Generate 3 or 4 descriptions
- Each description MUST respect the 90 character limit

CALLOUT RULES:
- Generate at least 4 callouts
- Each callout MUST respect the 25 character limit

CAMPAIGN CONTEXT:
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
  "sitelinks": [],
  "callouts": []
}
`;
};
