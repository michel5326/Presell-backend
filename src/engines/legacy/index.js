const fs = require("fs");
const { v4: uuid } = require("uuid");
const { chromium, devices } = require("playwright");

const { uploadToR2 } = require("../../services/r2");
const { safeUnlink } = require("../../utils/file.utils");
const { applyGlobals } = require("../../utils/html.utils");
const { findTemplate } = require("../../utils/file.utils");

/* =========================
   BROWSER SINGLETON
========================= */
let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });
  }
  return browserInstance;
}

/* =========================
   SPEED OPTIMIZATION
========================= */
async function optimizeRequests(page) {
  await page.route("**/*", route => {
    const type = route.request().resourceType();

    if (
      type === "image" ||
      type === "media" ||
      type === "font"
    ) {
      return route.abort();
    }

    route.continue();
  });
}

/* =========================
   PREPARE PAGE
========================= */
async function preparePageForScreenshot(page) {

  await page.waitForTimeout(1500);

  await page.mouse.move(200, 200);
  await page.waitForTimeout(200);
  await page.mouse.move(400, 350);
  await page.waitForTimeout(300);

  await page.evaluate(() => {

    const selectors = [
      '[id*="cookie"]',
      '[class*="cookie"]',
      '[id*="consent"]',
      '[class*="consent"]',
      '[aria-label*="cookie"]',
      '[role="dialog"]',
      '[class*="overlay"]',
      '[class*="modal"]'
    ];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });

    document.body.style.overflow = "auto";

  });

  await page.evaluate(() => {
    window.scrollTo(0, window.innerHeight / 2);
  });

  await page.waitForTimeout(800);

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });

  await page.waitForTimeout(300);

  const isBlocked = await page.evaluate(() => {

    const t = document.body.innerText.toLowerCase();

    return (
      t.includes("access denied") ||
      t.includes("blocked") ||
      t.includes("checking your browser") ||
      t.includes("verify you are human") ||
      t.includes("captcha")
    );

  });

  if (isBlocked) {
    throw new Error("anti_bot_detected");
  }

}

/* =========================
   GENERATE LEGACY
========================= */
async function generateLegacyPage({
  templateId,
  productUrl,
  affiliateUrl,
  language,
  legacyData,
  flatBody,
  userEmail
}) {

  console.log("🔄 Executando fluxo Legacy");

  const finalLegacyData = { ...legacyData, ...flatBody };

  delete finalLegacyData.templateId;
  delete finalLegacyData.productUrl;
  delete finalLegacyData.affiliateUrl;
  delete finalLegacyData.language;

  const templatePath = findTemplate(templateId);

  if (!templatePath) {
    throw new Error("Template legacy não encontrado");
  }

  const id = uuid();

  const d = `desktop-${id}.png`;
  const m = `mobile-${id}.png`;

  const browser = await getBrowser();

  try {

    /* =========================
       DESKTOP
    ========================= */

    const contextDesktop = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      locale: "en-US",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    });

    const p = await contextDesktop.newPage();

    await optimizeRequests(p);

    await p.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });

    await p.waitForTimeout(2500);

    await preparePageForScreenshot(p);

    await p.screenshot({
      path: d,
      fullPage: false
    });

    await p.close();
    await contextDesktop.close();

    /* =========================
       MOBILE
    ========================= */

    const contextMobile = await browser.newContext({
      ...devices["iPhone 12"],
      deviceScaleFactor: 1
    });

    const p2 = await contextMobile.newPage();

    await optimizeRequests(p2);

    await p2.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });

    await p2.waitForTimeout(2500);

    await preparePageForScreenshot(p2);

    await p2.screenshot({
      path: m,
      fullPage: false
    });

    await p2.close();
    await contextMobile.close();

    /* =========================
       UPLOAD
    ========================= */

    const du = await uploadToR2(d, `desktop/${d}`);
    const mu = await uploadToR2(m, `mobile/${m}`);

    let html = fs
      .readFileSync(templatePath, "utf8")
      .replaceAll("{{DESKTOP_PRINT}}", du)
      .replaceAll("{{MOBILE_PRINT}}", mu)
      .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl);

    for (const [k, v] of Object.entries(finalLegacyData)) {
      html = html.replaceAll(`{{${k}}}`, String(v));
    }

    html = applyGlobals(html);

    return html;

  } finally {

    safeUnlink(d);
    safeUnlink(m);

    // NÃO fechamos o browser para manter singleton

  }

}

module.exports = { generateLegacyPage };