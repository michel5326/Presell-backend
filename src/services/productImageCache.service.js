const { query } = require('./db');

/**
 * Busca imagem cacheada por domínio
 * @param {string} domain
 * @returns {string|null}
 */
async function getImageByDomain(domain) {
  if (!domain) return null;

  const res = await query(
    `SELECT image_url
       FROM product_images
      WHERE domain = $1
      LIMIT 1`,
    [domain]
  );

  return res.rows[0]?.image_url || null;
}

/**
 * Salva ou atualiza imagem por domínio
 * @param {string} domain
 * @param {string} imageUrl
 * @param {'manual'|'auto'} source
 */
async function saveImageForDomain(domain, imageUrl, source) {
  if (!domain || !imageUrl || !source) return;

  await query(
    `INSERT INTO product_images (domain, image_url, source)
     VALUES ($1, $2, $3)
     ON CONFLICT (domain)
     DO UPDATE SET
       image_url = EXCLUDED.image_url,
       source = EXCLUDED.source,
       updated_at = NOW()`,
    [domain, imageUrl, source]
  );
}

module.exports = {
  getImageByDomain,
  saveImageForDomain,
};
