const { supabaseAdmin } = require("../services/supabase");

async function kiwifyWebhook(req, res) {
  try {
    /* =========================
       AUTH DO WEBHOOK
    ========================= */
    const token = req.headers["x-webhook-token"];
    if (token !== process.env.KIWIFY_INTEGRATION_TOKEN_2026) {
      return res.status(403).json({ error: "invalid_webhook" });
    }

    const body = req.body;

    /* =========================
       EVENTO VÁLIDO
    ========================= */
    if (body?.webhook_event_type !== "order_approved") {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const email = body?.Customer?.email;
    if (!email) {
      return res.status(400).json({ error: "email_missing" });
    }

    /* =========================
       ACESSO (IDEMPOTENTE)
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

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e.message);
    return res.status(500).json({ error: "webhook_failed" });
  }
}

module.exports = kiwifyWebhook;
