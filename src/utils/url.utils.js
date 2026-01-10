function normalizeUrl(u, base) {
  try {
    if (!u) return "";
    let s = String(u).trim();

    if (s.startsWith("//")) {
      return base.protocol + s;
    }

    if (s.startsWith("/")) return base.origin + s;
    if (/^https?:\/\//i.test(s)) return s;

    return new URL(s, base.href).href;
  } catch {
    return "";
  }
}

function fixImageUrl(url) {
  if (!url) return "";

  let fixed = String(url).trim();

  fixed = fixed.replace(/(https?:\/\/[^\/]+)\/\//g, "$1/");
  fixed = fixed.replace(/\?v=\d+$/, "");
  fixed = fixed.replace(/\?version=\d+$/, "");
  fixed = fixed.replace(/\?t=\d+$/, "");
  fixed = fixed.replace(/\?$/, "");
  fixed = fixed.replace(/(\.\.\/)+/g, "");

  return fixed;
}

function validateImageUrl(url) {
  if (!url) return "";

  let u = String(url).trim();
  u = fixImageUrl(u);

  if (!/^https?:\/\//i.test(u)) return "";
  if (u.startsWith("data:")) return "";
  if (/\.svg(\?|#|$)/i.test(u)) return "";

  return u;
}

module.exports = {
  normalizeUrl,
  fixImageUrl,
  validateImageUrl,
};
