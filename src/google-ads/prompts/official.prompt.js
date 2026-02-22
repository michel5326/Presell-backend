module.exports = function officialPrompt({
  keyword,
  language,
  baseUrl
}) {
  return `
You are an expert Google Ads Search advertiser.

INTENT: OFFICIAL / PURCHASE (80% SAFE STRATEGIC MODE)

Generate a Google Ads Search campaign focused on strong buying intent
while remaining compliant for sensitive niches.

The tone should feel direct, confident, and transactional,
but NOT exaggerated or aggressive.

────────────────────────
SAFETY RULES
────────────────────────
- No medical claims
- No guaranteed results
- No miracle language
- No before/after implications
- No discounts or price promotions
- Avoid urgency words like "Limited", "Hurry"
- "Now" may be used sparingly (max once)
- Respect all character limits strictly

────────────────────────
HEADLINES
────────────────────────

- Generate EXACTLY 15 headlines
- Max 30 characters each
- Maximum 3 headlines may contain "Official"
- At least 5 headlines must be verb-first
- At least 4 headlines must NOT start with the brand
- Avoid repeating the same word order
- Avoid repeating identical phrases

Focus strongly on:
- Buy
- Order
- Get
- Shop
- Secure
- Direct access
- Online purchase
- Authorized source
- Availability

Headlines should feel commercially clear,
but not promotional or exaggerated.

────────────────────────
DESCRIPTIONS
────────────────────────

- Generate 3 or 4 descriptions
- Max 90 characters
- Reinforce buying clarity
- Mention official access or authorized source
- Maintain neutral tone
- Avoid repeating headlines

────────────────────────
CALLOUTS
────────────────────────

- At least 4
- Max 25 characters
- Informational but purchase-aligned

────────────────────────
SITELINKS
────────────────────────

- Exactly 4
- Focus on:
  - Where to Buy
  - Official Access
  - Ingredients Info
  - Customer Reviews
- Neutral tone
- No urgency

────────────────────────
KEYWORDS
────────────────────────

Focus on high-intent variations:
- buy ${keyword}
- order ${keyword}
- ${keyword} official site
- ${keyword} where to buy
- ${keyword} authorized source
- ${keyword} online purchase

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