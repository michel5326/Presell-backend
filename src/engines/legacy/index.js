async function generateLegacyPage({
  templateId,
  productUrl,
  affiliateUrl,
  language,
  legacyData,
  flatBody,
  userEmail
}) {
    /* ===== LEGACY (MODO ANTIGO) ===== */
console.log("🔄 Executando fluxo Legacy");

const finalLegacyData = { ...legacyData, ...flatBody };
delete finalLegacyData.templateId;
delete finalLegacyData.productUrl;
delete finalLegacyData.affiliateUrl;
delete finalLegacyData.language;

// encontrar template
const templatePath = findTemplate(templateId);
if (!templatePath) {
  throw new Error("Template legacy não encontrado");
}

// Screenshots
const id = uuid();
const d = `desktop-${id}.png`;
const m = `mobile-${id}.png`;

const browser = await chromium.launch({ headless: true });

const p = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await p.goto(productUrl);
await p.screenshot({ path: d });
await p.close();

const p2 = await browser.newPage(devices["iPhone 12"]);
await p2.goto(productUrl);
await p2.screenshot({ path: m });
await p2.close();

const du = await uploadToR2(d, `desktop/${d}`);
const mu = await uploadToR2(m, `mobile/${m}`);

safeUnlink(d);
safeUnlink(m);
await browser.close();

// Processar template legacy
let html = fs.readFileSync(templatePath, "utf8")
  .replaceAll("{{DESKTOP_PRINT}}", du)
  .replaceAll("{{MOBILE_PRINT}}", mu)
  .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl);

for (const [k, v] of Object.entries(finalLegacyData)) {
  html = html.replaceAll(`{{${k}}}`, String(v));
}

html = applyGlobals(html);

// 🔒 IMPORTANTE: engine SEMPRE retorna HTML
return html;

  return html;
}

module.exports = { generateLegacyPage };
