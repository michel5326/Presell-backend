const presellEditorialEngine = require('../engines/presell-editorial');

async function generateEditorialPresell(req, res) {
  try {
    const {
      affiliateUrl,
      problem,
      adPhrase,         // opcional (Google Ads match)
      trackingScript,   // pass-through
    } = req.body;

    // 🔒 Validação mínima e objetiva
    if (!affiliateUrl || !problem) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    // 🔧 Chamada da engine editorial (TOF)
    const result = await presellEditorialEngine.generate({
      affiliateUrl,
      problem,
      adPhrase,
      trackingScript,
    });

    // 🔍 DEBUG LIMPO (mesmo padrão do projeto)
    console.log('============= PRESELL EDITORIAL DEBUG =============');
    console.log('[ROUTE]', '/presell/editorial');
    console.log('[PROBLEM]', problem);
    console.log('[AD PHRASE]', adPhrase || 'EMPTY');
    console.log('[HTML LENGTH]', result?.html?.length || 0);
    console.log('[TRACKING_SCRIPT]', trackingScript ? 'PRESENT' : 'EMPTY');
    console.log('===================================================');

    return res.json(result);
  } catch (err) {
    console.error('[presell-editorial.controller]', err);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}

module.exports = {
  generateEditorialPresell,
};
