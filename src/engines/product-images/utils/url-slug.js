/**
 * Extrai um slug simples do domínio do produto.
 *
 * Ex:
 * - https://prodentim24.com -> prodentim
 * - https://www.mitolyn.com -> mitolyn
 */
function extractDomainSlug(productUrl) {
  try {
    const { hostname } = new URL(productUrl);

    // remove www.
    const cleanHost = hostname.replace(/^www\./, '');

    // pega a primeira parte do domínio
    const slug = cleanHost.split('.')[0];

    return slug.toLowerCase();
  } catch {
    return '';
  }
}

module.exports = {
  extractDomainSlug,
};
