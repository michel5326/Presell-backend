const { supabaseAdmin } = require("../services/supabase");

async function kiwifyWebhook(req, res) {
  try {
    const body = req.body;

    const eventType = body?.order?.webhook_event_type;
    const email = body?.order?.Customer?.email;

    if (!eventType || !email) {
      return res.status(400).json({ error: "invalid_payload" });
    }

    /* =========================
       REEMBOLSO
    ========================= */
    if (eventType === "order_refunded") {
      await supabaseAdmin
        .from("user_access")
        .update({
          access_until: new Date().toISOString(),
        })
        .eq("email", email);

      console.log("ACCESS REVOKED (REFUND):", email);

      return res.status(200).json({ ok: true, refunded: true });
    }

    /* =========================
       EVENTO NÃO SUPORTADO
    ========================= */
    if (eventType !== "order_approved") {
      return res.status(200).json({ ok: true, ignored: true });
    }

    /* =========================
       CRIAR / REAPROVEITAR USUÁRIO
    ========================= */
    await supabaseAdmin.auth.admin
      .createUser({
        email,
        email_confirm: true,
      })
      .catch(() => {});

    /* =========================
       ACESSO DE 6 MESES
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
       GERAR LINK DE ACESSO
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
