const { supabaseAdmin } = require("../services/supabase");

async function kiwifyWebhook(req, res) {
  try {
    const body = req.body;

    /* =========================
       1. VALIDAR EVENTO
    ========================= */
    const eventType = body?.order?.webhook_event_type;
    if (eventType !== "order_approved") {
      return res.status(200).json({ ok: true, ignored: true });
    }

    /* =========================
       2. PEGAR EMAIL
    ========================= */
    const email = body?.order?.Customer?.email;
    if (!email) {
      return res.status(400).json({ error: "email_missing" });
    }

    /* =========================
       3. CRIAR OU REAPROVEITAR USUÁRIO
    ========================= */
    await supabaseAdmin.auth.admin
      .createUser({
        email,
        email_confirm: true,
      })
      .catch(() => {}); // idempotente

    /* =========================
       4. DEFINIR ACESSO (6 MESES)
    ========================= */
    const accessUntil = new Date();
    accessUntil.setMonth(accessUntil.getMonth() + 6);

    await supabaseAdmin
      .from("user_access")
      .upsert(
        {
          email,
          access_until: accessUntil.toISOString(),
        },
        { onConflict: "email" }
      );

    /* =========================
       5. GERAR LINK DE ACESSO
    ========================= */
    const { data, error } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: "https://clickpage.vercel.app/login",
        },
      });

    if (error) throw error;

    /* =========================
       6. LOG (TEMPORÁRIO)
    ========================= */
    console.log(
      "KIWIFY CLIENT ACCESS LINK:",
      data.properties.action_link
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("KIWIFY WEBHOOK ERROR:", err.message);
    return res.status(500).json({ error: "webhook_failed" });
  }
}

module.exports = kiwifyWebhook;
