/* =========================
   ENV
========================= */
require("dotenv").config();

/* =========================
   DEPENDÊNCIAS BÁSICAS
========================= */
const express = require("express");
const cors = require("cors");

/* =========================
   APP
========================= */
const app = express();

/* =========================
   CORS
========================= */
app.use(
  cors({
    origin: ["https://clickpage.vercel.app", "https://clickpage.lovable.app"],
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-worker-token", "x-user-email"],
  })
);

app.use(express.json());

/* =========================
   SUPABASE ADMIN
========================= */
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

console.log("✅ Supabase Admin inicializado");


/* =========================
   WEBHOOK — KIWIFY (ORDER APPROVED)
========================= */
app.post("/webhooks/kiwify", async (req, res) => {
  try {
    const body = req.body;

    console.log("🔔 KIWIFY WEBHOOK RECEBIDO");
    console.log(JSON.stringify(body, null, 2));

    if (body?.webhook_event_type !== "order_approved") {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const email = body?.Customer?.email;
    const productId = body?.Product?.product_id;

    if (!email || !productId) {
      console.error("❌ Dados obrigatórios ausentes");
      return res.status(200).json({ ok: false });
    }

    const accessUntil = new Date();
    accessUntil.setMonth(accessUntil.getMonth() + 6);

    const { error } = await supabaseAdmin
      .from("user_access")
      .upsert(
        {
          email,
          product_id: productId,
          access_until: accessUntil.toISOString(),
          source: "kiwify",
        },
        { onConflict: "email,product_id" }
      );

    if (error) {
      console.error("❌ Erro ao salvar acesso:", error.message);
      return res.status(200).json({ ok: false });
    }

    console.log("✅ Acesso liberado para:", email);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("🔥 Erro no webhook:", e.message);
    return res.status(200).json({ ok: false });
  }
});


/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WORKER rodando na porta ${PORT}`);
});
