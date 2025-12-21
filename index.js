const express = require("express");
const cors = require("cors");
const { chromium, devices } = require("playwright");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ======================================================
// CORS
// ======================================================
app.use(
  cors({
    origin: [
      "https://clickpage.vercel.app",
      "https://clickpage.lovable.app",
    ],
    methods: ["POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "x-worker-token",
      "x-admin-token", // 👈 ADICIONADO
    ],
  })
);

app.use(express.json());

const WORKER_TOKEN = process.env.WORKER_TOKEN;

// ======================================================
// SUPABASE ADMIN
// ======================================================
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ======================================================
// CLOUDFLARE R2
// ======================================================
const s3 = new AWS.S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  signatureVersion: "v4",
  region: "auto",
});

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;

// ======================================================
// HELPERS
// ======================================================
function safeUnlink(file) {
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {}
}

function findTemplate(templateId) {
  const templatesDir = path.join(process.cwd(), "templates");
  const file = path.join(templatesDir, `${templateId}.html`);
  return fs.existsSync(file) ? file : null;
}

async function uploadToR2(localPath, remoteKey) {
  const buffer = fs.readFileSync(localPath);

  await s3
    .putObject({
      Bucket: BUCKET,
      Key: remoteKey,
      Body: buffer,
      ContentType: "image/png",
    })
    .promise();

  return `${PUBLIC_BASE_URL}/${remoteKey}`;
}

// ======================================================
// 🔐 ADMIN TEST ROUTE — CREATE USER (PROTEGIDA)
// ======================================================
app.post("/admin/create-user", async (req, res) => {
  const adminToken = req.headers["x-admin-token"];

  if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "email required" });
  }

  // senha simples só para teste
  const password = Math.random().toString(36).slice(-10) + "A1!";

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    success: true,
    email,
    password, // ⚠️ só para teste agora
  });
});

// ======================================================
// CLICKPAGE GENERATE ROUTE (INALTERADO)
// ======================================================
app.post("/generate", async (req, res) => {
  if (req.headers["x-worker-token"] !== WORKER_TOKEN) {
    return res.status(403).json({ error: "forbidden" });
  }
    // 🔒 Access control by email
  const userEmail = req.headers["x-user-email"];

  if (!userEmail) {
    return res.status(401).json({ error: "user email missing" });
  }

  const { data: accessData, error: accessError } =
    await supabaseAdmin
      .from("user_access")
      .select("access_until")
      .eq("email", userEmail)
      .single();

  if (accessError || !accessData) {
    return res.status(403).json({ error: "access not found" });
  }

  const now = new Date();
  const accessUntil = new Date(accessData.access_until);

  if (accessUntil < now) {
    return res.status(403).json({ error: "access expired" });
  }


  const {
    templateId,
    productUrl,
    affiliateUrl,
    trackingScript,
    texts,
    numbers,
  } = req.body;

  if (!templateId || !productUrl || !affiliateUrl) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const templatePath = findTemplate(templateId);
  if (!templatePath) {
    return res.status(404).json({
      error: `Template '${templateId}.html' não encontrado`,
    });
  }

  const id = uuid();
  const desktopFile = `desktop-${id}.png`;
  const mobileFile = `mobile-${id}.png`;

  let browser;

  try {
    browser = await chromium.launch({ headless: true });

    const page = await browser.newPage({
      viewport: { width: 1366, height: 768 },
    });

    await page.goto(productUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: desktopFile, fullPage: false });
    await page.close();

    const iphone = devices["iPhone 12"];
    const pageMobile = await browser.newPage({ ...iphone });

    await pageMobile.goto(productUrl, { waitUntil: "domcontentloaded" });
    await pageMobile.waitForTimeout(800);
    await pageMobile.screenshot({ path: mobileFile, fullPage: false });
    await pageMobile.close();

    const desktopUrl = await uploadToR2(desktopFile, `desktop/${desktopFile}`);
    const mobileUrl = await uploadToR2(mobileFile, `mobile/${mobileFile}`);

    safeUnlink(desktopFile);
    safeUnlink(mobileFile);

    let html = fs.readFileSync(templatePath, "utf8");

    html = html
      .replaceAll("{{DESKTOP_PRINT}}", desktopUrl)
      .replaceAll("{{MOBILE_PRINT}}", mobileUrl)
      .replaceAll("{{AFFILIATE_LINK}}", affiliateUrl);

    if (texts && typeof texts === "object") {
      for (const [key, value] of Object.entries(texts)) {
        if (typeof value === "string") {
          html = html.replaceAll(`{{${key}}}`, value);
        }
      }
    }

    if (numbers && typeof numbers === "object") {
      for (const [key, value] of Object.entries(numbers)) {
        if (typeof value === "number") {
          html = html.replaceAll(`{{${key}}}`, String(value));
        }
      }
    }

    if (trackingScript && typeof trackingScript === "string") {
      html = html.replace("</body>", `${trackingScript}\n</body>`);
    }

    return res
      .status(200)
      .set("Content-Type", "text/html; charset=utf-8")
      .send(html);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
});

// ======================================================
const PORT = process.env.PORT || 3000;
// ======================================================
// STRIPE WEBHOOK (PLACEHOLDER — AINDA NÃO ATIVO)
// ======================================================
app.post("/webhooks/stripe", (req, res) => {
  return res.status(200).json({ received: true });
});
// ======================================================
// KIWIFY WEBHOOK — CREATE USER IF NOT EXISTS (FIXED)
// ======================================================
app.post("/webhooks/kiwify", async (req, res) => {
  try {
    const eventType = req.body?.webhook_event_type;
    const orderStatus = req.body?.order_status;

    // 1. Só processa venda aprovada
    if (eventType !== "order_approved" || orderStatus !== "paid") {
      return res.status(200).json({ ignored: true });
    }

    // 2. Extrair email do cliente
    const email =
      req.body?.Customer?.email ||
      req.body?.customer?.email ||
      null;

    if (!email) {
      console.log("❌ Webhook Kiwify sem email");
      return res.status(200).json({ error: "email not found" });
    }

    // 3. Listar usuários e verificar se já existe
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (error) {
      console.log("❌ Erro ao listar usuários:", error.message);
      return res.status(500).json({ error: "failed to list users" });
    }

    const userExists = data.users.some(
      (user) => user.email === email
    );

    if (userExists) {
      console.log(`ℹ️ Usuário já existe: ${email}`);
      return res.status(200).json({ already_exists: true });
    }

    // 4. Criar usuário SEM senha
    const { error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
      });

    if (createError) {
      console.log("❌ Erro ao criar usuário:", createError.message);
      return res.status(500).json({ error: "failed to create user" });
    }

    console.log(`✅ Usuário criado e email enviado: ${email}`);
    // 5. Calcular acesso por 6 meses
const accessUntil = new Date();
accessUntil.setMonth(accessUntil.getMonth() + 6);

// 6. Buscar usuário criado para obter o ID
const { data: usersData, error: listError } =
  await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

if (listError) {
  console.log("❌ Erro ao listar usuários:", listError.message);
  return res.status(500).json({ error: "failed to list users" });
}

const createdUser = usersData.users.find(
  (user) => user.email === email
);

if (!createdUser) {
  console.log("❌ Usuário criado não encontrado:", email);
  return res.status(500).json({ error: "user not found after creation" });
}

// 7. Salvar acesso na tabela user_access
const { error: accessError } = await supabaseAdmin
  .from("user_access")
  .insert({
    user_id: createdUser.id,
    email,
    access_until: accessUntil.toISOString(),
  });

if (accessError) {
  console.log("❌ Erro ao salvar acesso:", accessError.message);
} else {
  console.log(`🕒 Acesso liberado até ${accessUntil.toISOString()}`);
}


    return res.status(200).json({ created: true });
  } catch (err) {
    console.log("❌ Erro no webhook Kiwify:", err.message);
    return res.status(500).json({ error: "internal error" });
  }
});





app.listen(PORT, () => {
  console.log(`🚀 WORKER rodando na porta ${PORT}`);
});
