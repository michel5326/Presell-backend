const fs = require("fs");
const { v4: uuid } = require("uuid");
const { chromium, devices } = require("playwright");

const { uploadToR2 } = require("../../services/r2");
const { safeUnlink } = require("../../utils/file.utils");
const { applyGlobals } = require("../../utils/html.utils");
const { findTemplate } = require("../../utils/file.utils");

async function preparePageForScreenshot(page) {
  // espera base
  await page.waitForTimeout(1500);

  // remove overlays / cookies
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

  // scroll para ativar lazy-load
  await page.evaluate(() => {
    window.scrollTo(0, window.innerHeight / 2);
  });
  await page.waitForTimeout(800);

  // volta para o topo antes do print
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);

  // detectar anti-bot explícito
  const isBlocked = await page.evaluate(() => {
    const t = document.body.innerText.toLowerCase();
    return (
      t.includes("access denied") ||
      t.includes("blocked") ||
      t.includes("checking your browser") ||
      t.includes("sorry")
    );
  });

  if (isBlocked) {
    throw new Error("anti_bot_detected");
  }
}

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

  const browser = await chromium.launch({ headless: true });

  try {
    // ===== DESKTOP =====
    const p = await browser.newPage({ viewport: { width: 1366, height: 768 } });

    await p.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await preparePageForScreenshot(p);
    await p.screenshot({ path: d, fullPage: false });
    await p.close();

    // ===== MOBILE =====
    const p2 = await browser.newPage({
      ...devices["iPhone 12"],
      deviceScaleFactor: 1
    });

    await p2.goto(productUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await preparePageForScreenshot(p2);
    await p2.screenshot({ path: m, fullPage: false });
    await p2.close();

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
    await browser.close();
  }
}

module.exports = { generateLegacyPage };
