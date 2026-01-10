const { chromium } = require('playwright');

let browserPromise = null;

/**
 * Browser singleton (process-level)
 * - Reaproveita o Chromium para evitar custo de cold start por request
 * - Cria context/page por chamada (isolamento)
 */
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }
  return browserPromise;
}

async function withPage(fn, options = {}) {
  const browser = await getBrowser();

  const context = await browser.newContext({
    viewport: options.viewport || { width: 1280, height: 800 },
    userAgent:
      options.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    locale: options.locale || 'en-US',
  });

  const page = await context.newPage();

  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

// Fecha o browser no shutdown do processo
process.on('SIGINT', async () => {
  try {
    const b = await browserPromise;
    if (b) await b.close();
  } catch {}
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    const b = await browserPromise;
    if (b) await b.close();
  } catch {}
  process.exit(0);
});

module.exports = {
  withPage,
};
