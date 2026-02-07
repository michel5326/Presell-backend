const fs = require("fs");
const { v4: uuid } = require("uuid");
const { chromium, devices } = require("playwright");

const { uploadToR2 } = require("../../services/r2");
const { safeUnlink } = require("../../utils/file.utils");
const { applyGlobals } = require("../../utils/html.utils");
const { findTemplate } = require("../../utils/file.utils");

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

    // --- ALTERAÇÃO DESKTOP ---
    const p = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    
    // 1. Adicionamos 'waitUntil: "networkidle"' para esperar baixar tudo (imagens, scripts)
    await p.goto(productUrl, { waitUntil: 'networkidle' });
    
    // 2. Adicionamos uma pequena espera extra (ex: 2 seg) para garantir que fontes e animações CSS carregaram visualmente
    await p.waitForTimeout(2000); 
    
    await p.screenshot({ path: d, fullPage: false }); // fullPage: false garante que pega apenas o viewport (o que aparece na tela)
    await p.close();

    // --- ALTERAÇÃO MOBILE ---
    const p2 = await browser.newPage(devices["iPhone 12"]);
    
    await p2.goto(productUrl, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(2000); 
    
    await p2.screenshot({ path: m, fullPage: false });
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
}

module.exports = { generateLegacyPage };