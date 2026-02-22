module.exports = function officialPrompt({
  keyword,
  language,
  baseUrl
}) {
  return `
You are an expert Google Ads Search advertiser.

INTENT: OFFICIAL / PURCHASE

Generate a Google Ads Search campaign focused on official access and buying intent.
Tone must remain neutral and compliant.

GENERAL RULES:
- No medical claims
- No exaggerated promises
- No urgency
- No discounts or pricing
- Safe for sensitive niches
- Respect all character limits

HEADLINES:
- Generate EXACTLY 15 headlines
- Max 30 characters each
- Max 3 headlines may contain the word "Official"
- At least 4 headlines must NOT start with the brand
- Include at least 3 verb-first headlines (Buy, Order, Access, Get)
- Avoid repeating the same structural pattern
- Focus on:
  - Buy
  - Order
  - Where to buy
  - Access
  - Availability
  - Authorized source

DESCRIPTIONS:
- 3 or 4 descriptions
- Max 90 characters
- Emphasize official access and purchase clarity
- Remain neutral and informational

CALLOUTS:
- At least 4
- Max 25 characters
- Informational only

SITELINKS:
- Exactly 4
- Navigation and purchase focused

KEYWORDS:
Focus on:
- ${keyword} official site
- buy ${keyword}
- order ${keyword}
- ${keyword} where to buy
- ${keyword} official

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