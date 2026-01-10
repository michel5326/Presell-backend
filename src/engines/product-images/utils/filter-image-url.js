/**
 * Filtro binário de URLs de imagem.
 * Retorna true se a URL DEVE ser descartada.
 *
 * Regras:
 * 1) Descarta lixo óbvio (data, svg, pixel, logo, rating, UI)
 * 2) Exige keyword explícita de produto no nome da imagem
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

  // logos / identidade visual
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

  // 🔒 DIRECIONAMENTO POSITIVO: exigir nome de produto
  const productKeywords = [
    'product',
    'bottle',
    'supplement',
    'jar',
    'capsule',
    'capsules',
    'pack',
  ];

  const hasProductKeyword = productKeywords.some(keyword =>
    lower.includes(keyword)
  );

  if (!hasProductKeyword)
