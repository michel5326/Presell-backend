const axios = require('axios');

/**
 * Extrai múltiplos vídeos do HTML do YouTube
 */
function extractVideos(html) {
  if (!html) return [];

  const regex = /"videoId":"([a-zA-Z0-9_-]{11})".+?"title":\{"runs":\[\{"text":"([^"]+)"/g;
  const results = [];

  let match;
  while ((match = regex.exec(html)) !== null) {
    results.push({
      id: match[1],
      title: match[2],
    });
  }

  return results;
}

/**
 * Heurística simples para validar vídeo de review
 */
function isValidReviewVideo({ title }, productName) {
  if (!title) return false;

  const t = title.toLowerCase();

  const forbidden = [
    'short',
    'tiktok',
    'music',
    'song',
    'meme',
    'parody',
    'edit',
    'reaction',
    'unboxing',
  ];

  if (!t.includes('review')) return false;
  if (!t.includes(productName.toLowerCase())) return false;
  if (forbidden.some(word => t.includes(word))) return false;

  return true;
}

/**
 * Busca um vídeo de review relevante no YouTube (scraping)
 * @param {string} query
 * @returns {string|null} videoId
 */
async function findYoutubeVideo(query) {
  if (!query) return null;

  try {
    const productName = query.split(' ')[0]; // ex: ProDentim

    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${productName} review`
    )}`;

    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const videos = extractVideos(data);

    const valid = videos.find(v =>
      isValidReviewVideo(v, productName)
    );

    return valid ? valid.id : null;
  } catch (err) {
    console.error('[youtube.service] fail');
    return null;
  }
}

module.exports = {
  findYoutubeVideo,
};
