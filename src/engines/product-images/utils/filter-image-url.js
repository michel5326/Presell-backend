/**
 * Filtro binário de URLs de imagem.
 * Retorna true se a URL DEVE ser descartada.
 */
function shouldDiscardImageUrl(url) {
  if (!url || typeof url !== 'string') return true;

  const lower = url.toLowerCase();

  // data URI
  if (lower.startsWith('data:')) return true;

  // svg
  if (lower.endsWith('.svg')) return true;

  // pixels / trackers comuns
  if (
    lower.includes('pixel') ||
    lower.includes('spacer') ||
    lower.includes('1x1')
  ) {
    return true;
  }

  // banners / elementos não-produto
  if (
    lower.includes('banner') ||
    lower.includes('order') ||
    lower.includes('order-now') ||
    lower.includes('five icon') ||
    lower.includes('five-icon')
  ) {
    return true;
  }

  return false;
}

module.exports = {
  shouldDiscardImageUrl,
};
