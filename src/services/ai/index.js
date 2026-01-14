if (type === "review") {
  if (!productUrl) throw new Error("productUrl is required");
  if (!/^https?:\/\//i.test(productUrl)) {
    throw new Error("Invalid productUrl (must be absolute URL)");
  }

  systemPrompt = reviewPrompt;
  userPrompt = `Product URL: ${productUrl}`;

} else if (type === "robusta") {
  if (!productUrl) throw new Error("productUrl is required");
  if (!/^https?:\/\//i.test(productUrl)) {
    throw new Error("Invalid productUrl (must be absolute URL)");
  }

  systemPrompt = robustaPrompt;
  userPrompt = `Product URL: ${productUrl}`;

} else if (type === "editorial") {
  if (!problem) throw new Error("problem is required for editorial");

  systemPrompt = editorialPrompt;

  userPrompt = `
Problem:
${problem}

${adPhrase ? `Primary ad phrase:\n${adPhrase}` : ""}
  `.trim();

} else if (type === "editorial_scientific") {
  if (!problem) throw new Error("problem is required for scientific editorial");

  systemPrompt = editorialScientificPrompt;

  userPrompt = `
Problem:
${problem}

${adPhrase ? `Primary ad phrase:\n${adPhrase}` : ""}
  `.trim();

} else {
  throw new Error(`Unknown AI type: ${type}`);
}
