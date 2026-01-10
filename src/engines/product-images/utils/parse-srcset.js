/**
 * Parse simples de srcset.
 * Retorna array de URLs na ordem declarada.
 * NÃO escolhe melhor imagem.
 */
function parseSrcset(srcset) {
  if (!srcset || typeof srcset !== 'string') return [];

  return srcset
    .split(',')
    .map(part => part.trim().split(' ')[0])
    .filter(Boolean);
}

module.exports = {
  parseSrcset,
};
