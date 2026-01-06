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
   WEBHOOK — KIWIFY (BÁSICO)
========================= */
app.post("/webhooks/kiwify", (req, res) => {
  console.log("🔔 KIWIFY WEBHOOK RECEBIDO");
  console.log("Headers:", req.headers);
  console.log("Body:", JSON.stringify(req.body, null, 2));

  return res.status(200).json({ ok: true });
});


/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WORKER rodando na porta ${PORT}`);
});
