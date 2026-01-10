const { extractDomainSlug } = require('./url-slug');

/**
 * Filtro binário de URLs de imagem.
 * Retorna true se a URL DEVE ser descartada.
 *
 * Estratégia:
 * - Exclusões explícitas
 * - EXCEÇÃO: se filename contiver o slug do produto → NÃO descartar
 * - Sem heurística visual
 * - Determinístico
 */
function shouldDiscardImageUrl(url, productUrl) {
  if (!url || typeof url !== 'string') return true;

  const lower = url.toLowerCase();

  // 🔓 EXCEÇÃO FORTE: nome do produto no filename
  const slug = extractDomainSlug(productUrl);
  if (slug && lower.includes(slug)) {
    return false;
  }

  // data URI
  if (lower.startsWith('data:')) return true;

  // svg
  if (lower.endsWith('.svg')) return true;

  // pixels / trackers
  if (
    lower.includes('pixel') ||
    lower.includes('spacer') ||
    lower.includes('1x1')
  ) {
    return true;
  }

  // banners / ações
  if (
    lower.includes('banner') ||
    lower.includes('order') ||
    lower.includes('order-now') ||
    lower.includes('checkout')
  ) {
    return true;
  }

  // logos / identidade
  if (
    lower.includes('logo') ||
    lower.includes('brand') ||
    lower.includes('icon')
  ) {
    return true;
  }

  // ratings / badges / selos
  if (
    lower.includes('rating') ||
    lower.includes('star') ||
    lower.includes('stars') ||
    lower.includes('review') ||
    lower.includes('badge') ||
    lower.includes('trust') ||
    lower.includes('seal')
  ) {
    return true;
  }

  // pagamentos / garantia / comercial
  if (
    lower.includes('guarantee') ||
    lower.includes('money-back') ||
    lower.includes('refund') ||
    lower.includes('shipping') ||
    lower.includes('delivery') ||
    lower.includes('payment') ||
    lower.includes('secure') ||
    lower.includes('credit') ||
    lower.includes('visa') ||
    lower.includes('mastercard') ||
    lower.includes('paypal')
  ) {
    return true;
  }

  // genérico / teste
  if (
    lower.includes('generic') ||
    lower.includes('test')
  ) {
    return true;
  }

  return false;
}

module.exports = {
  shouldDiscardImageUrl,
};
