const axios = require('axios');

/**
 * Normaliza string para comparação segura
 */
function normalize(str = '') {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // remove símbolos
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrai ID de uma URL do YouTube (fallback manual)
 */
function extractYoutubeIdFromUrl(url = '') {
  const regex =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;

  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Extrai nome do produto a partir da query
 * Ex: "ProstaVive Review" -> "prostavive"
 */
function extractProductName(query = '') {
  const cleaned = normalize(query)
    .replace(/\b(review|official|supplement|does|really|work|this)\b/g, '')
    .trim();

  // pega a primeira palavra longa (>= 6 chars)
  const parts = cleaned.split(' ');
  return parts.find(p => p.length >= 6) || null;
}

/**
 * Extrai vídeos (id + título) do HTML do YouTube
 */
function extractVideos(html) {
  if (!html) return [];

  const regex =
    /"videoId":"([a-zA-Z0-9_-]{11})".+?"title":\{"runs":\[\{"text":"([^"]+)"/g;

  const videos = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    videos.push({
      id: match[1],
      title: normalize(match[2]),
    });
  }

  return videos;
}

/**
 * Verifica se o vídeo é um review real do produto
 */
function isValidReviewVideo(videoTitle, productName) {
  if (!videoTitle.includes('review')) return false;
  if (!productName) return false;

  // exige match do nome do produto no título
  return videoTitle.includes(productName);
}

/**
 * Busca vídeo de review confiável no YouTube (scraping)
 * OU usa link manual se fornecido
 */
async function findYoutubeVideo(query) {
  if (!query) return null;

  // 🔥 NOVO: se for link direto do YouTube, usa ele
  const manualId = extractYoutubeIdFromUrl(query);
  if (manualId) {
    return manualId;
  }

  try {
    const productName = extractProductName(query);
    if (!productName) return null;

    const searchQuery = `${productName} review`;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      searchQuery
    )}`;

    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const videos = extractVideos(data);

    const valid = videos.find(v =>
      isValidReviewVideo(v.title, productName)
    );

    return valid ? valid.id : null;
  } catch (err) {
    console.error('[youtube.service] search fail');
    return null;
  }
}

module.exports = {
  findYoutubeVideo,
};