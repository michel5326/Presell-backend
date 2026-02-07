module.exports = function searchCampaignPrompt({
  keyword,
  language,
  baseUrl,
  productContext
}) {
  return `
You are an expert Google Ads Search advertiser.

Your task is to generate a COMPLETE Google Ads Search campaign
using a HYBRID MODEL:
- Cognitive functions are FIXED
- Textual phrasing is VARIABLE

DO NOT generate synonyms or rephrasings of the same idea.
Each item must serve a DISTINCT purpose.

==============================
PRIMARY SOURCE OF TRUTH
==============================

Below is FACTUAL CONTENT extracted from the official product page.
This content is your PRIMARY reference.

- Use it to understand what the product is
- Use it to infer category, format, usage, and positioning
- DO NOT invent features, benefits, or claims not supported by this text
- If information is unclear, stay neutral or generic

PRODUCT PAGE CONTENT:
"""
${productContext || 'No product content provided'}
"""

IMPORTANT:
- If the product content is generic, unclear, or repetitive:
  - Stay conservative
  - Prefer brand-neutral and category-level language
  - Avoid assumptions about features or differentiation

==============================
GENERAL RULES
==============================

- 100% original content
- No years, dates, or time references
- No exaggerated or medical claims
- No guarantees of results
- Neutral, informational, review-style tone
- Strictly respect character limits
- Content must be SAFE for Google Ads approval and comply with ad policy language standards
- Prefer factual descriptions over persuasive language
- If unsure, describe what the product IS, not what it DOES

==============================
CAMPAIGN CONTEXT
==============================

Main keyword: "${keyword}"
Language: "${language}"
Base URL (optional): "${baseUrl || 'N/A'}"

==============================
1) HEADLINES (15 TOTAL)
==============================

Generate EXACTLY 15 headlines.
Max 30 characters each.

Each headline MUST fulfill ONE of the following FUNCTIONS.
Do NOT repeat the same function twice.

HEADLINE FUNCTIONS:
1. Official / Brand information
2. Product category or type
3. What the product is
4. What the product is used for (neutral)
5. General product overview
6. Educational / learning angle
7. Trust / transparency
8. Credibility / information depth
9. User perspective (neutral)
10. Ingredients or composition
11. Usage or format
12. How it works (high-level)
13. Price or cost information
14. Availability or access
15. Where to find more information

Use the product content as reference.
Avoid speculation.

==============================
2) DESCRIPTIONS (4 TOTAL)
==============================

Generate EXACTLY 4 descriptions.
Max 90 characters each.

Each description MUST have a distinct ROLE:

1. High-level overview of the product
2. Informational details (ingredients, format, concept)
3. Trust-oriented context (neutral, research-style)
4. Access or usage information

Do NOT repeat ideas across descriptions.
Stay factual and restrained.

==============================
3) KEYWORDS
==============================

Generate keyword lists based on:
- the main keyword
- terms clearly supported by the product content

Provide:
- Exact match keywords
- Phrase match keywords
- Broad match keywords

Focus on:
- informational intent
- review intent
- product-related intent

Avoid assumptions.

==============================
4) STRUCTURED SNIPPETS
==============================

Generate 1–2 structured snippets.

You may ONLY use these headers:
- Benefits
- Features
- Information
- Highlights

Each snippet:
- 2–3 short, neutral items
- Must be supported by the product content
- Avoid medical, performance, or outcome claims

==============================
5) SITELINKS (ONLY IF BASE URL IS PROVIDED)
==============================

If a Base URL is provided, generate EXACTLY 4 sitelinks.

Each sitelink must fulfill ONE of these FUNCTIONS:
1. Official or main information
2. Reviews or user feedback
3. Ingredients or details
4. Usage or guide

For each sitelink, provide:
- Title (concise, neutral)
- Full URL extending the base URL

==============================
6) CALLOUTS (4 TOTAL)
==============================

Generate EXACTLY 4 callouts.
Max 25 characters each.

Each callout must reflect a DIFFERENT idea:
- Informational
- Neutral trust
- Transparency
- Access or availability

Short. Neutral. Compliant.

==============================
OUTPUT FORMAT
==============================

Return ONLY valid JSON.
No explanations.
No comments.
No markdown.
`;
};
