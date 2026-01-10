/**
 * Normaliza uma URL de imagem.
 * - Converte URLs relativas em absolutas
 * - Mantém URLs absolutas intactas
 * - Retorna null se não for possível resolver
 */
function normalizeImageUrl(rawUrl, baseUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  try {
    // já é absoluta
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }

    // URLs relativas ou protocol-relative
    const resolved = new URL(rawUrl, baseUrl);
    return resolved.href;
  } catch {
    return null;
  }
}

module.exports = {
  normalizeImageUrl,
};
