const axios = require('axios');

/**
 * Extrai o primeiro videoId válido do HTML do YouTube
 */
function extractVideoId(html) {
  if (!html) return null;

  const match = html.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Busca um vídeo no YouTube via scraping simples
 * @param {string} query
 * @returns {string|null} videoId
 */
async function findYoutubeVideo(query) {
  if (!query) return null;

  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    return extractVideoId(data);
  } catch (err) {
    return null;
  }
}

module.exports = {
  findYoutubeVideo,
};
