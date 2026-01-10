function applyGlobals(html) {
  return html.replaceAll(
    "{{CURRENT_YEAR}}",
    String(new Date().getFullYear())
  );
}

function safeReplace(html, placeholder, value) {
  if (value === undefined || value === null || value === "") {
    return html.replaceAll(placeholder, "");
  }

  return html.replaceAll(placeholder, String(value));
}

function cleanUnusedPlaceholders(html) {
  return html.replace(/\{\{[^}]+\}\}/g, "");
}

module.exports = {
  applyGlobals,
  safeReplace,
  cleanUnusedPlaceholders,
};
