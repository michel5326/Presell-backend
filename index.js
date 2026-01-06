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

    if (!email) {
      console.error("❌ Email ausente");
      return res.status(200).json({ ok: false });
    }

    const accessUntil = new Date();
    accessUntil.setMonth(accessUntil.getMonth() + 6);

    const { error } = await supabaseAdmin
      .from("user_access")
      .upsert(
        {
          email,
          access_until: accessUntil.toISOString(),
        },
        { onConflict: "email" }
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
   AUTH — MAGIC LINK LOGIN
========================= */
app.post("/auth/login", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email_required" });
    }

    // 1️⃣ verifica se tem acesso liberado
    const { data: access } = await supabaseAdmin
      .from("user_access")
      .select("access_until")
      .eq("email", email)
      .single();

    if (!access || new Date(access.access_until) < new Date()) {
      return res.status(403).json({ error: "access_denied" });
    }

    // 2️⃣ envia magic link
   const { data, error } = await supabaseAdmin.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: {
    redirectTo: "https://clickpage.vercel.app",
  },
});

console.log("DEBUG MAGIC LINK", { data, error });

    if (error) {
      console.error("❌ Erro magic link:", error.message);
      return res.status(500).json({ error: "magic_link_failed" });
    }

    console.log("📩 Magic link enviado para:", email);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("❌ Login error:", e.message);
    return res.status(500).json({ error: "internal_error" });
  }
});


/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WORKER rodando na porta ${PORT}`);
});
