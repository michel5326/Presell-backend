const { supabaseAdmin } = require("../services/supabase");

async function kiwifyWebhook(req, res) {
  try {
    const body = req.body;

    /* =========================
       TOLERÂNCIA DE PAYLOAD
    ========================= */
    const eventType =
      body?.order?.webhook_event_type ||
      body?.webhook_event_type;

    const email =
      body?.order?.Customer?.email ||
      body?.Customer?.email ||
      body?.email;

    if (!eventType) {
      return res.status(400).json({ error: "event_missing" });
    }

    // testes da Kiwify às vezes vêm sem email
    if (!email) {
      console.log("KIWIFY WEBHOOK TEST (NO EMAIL):");
      console.log(JSON.stringify(body, null, 2));
      return res.status(200).json({ ok: true, test: true });
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
        .eq("email", email.trim().toLowerCase());

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
       ACESSO (6 MESES)
    ========================= */
    const accessUntil = new Date();
    accessUntil.setMonth(accessUntil.getMonth() + 6);
    accessUntil.setHours(23, 59, 59, 999);

    await supabaseAdmin
      .from("user_access")
      .upsert(
        {
          email: email.trim().toLowerCase(),
          access_until: accessUntil.toISOString(),
        },
        { onConflict: "email" }
      );

    /* =========================
       MAGIC LINK (MESMO PADRÃO CAKTO)
    ========================= */
    await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "https://clickpage.vercel.app/reset-password",
      },
    });

    console.log("KIWIFY MAGIC LINK SENT:", email);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("KIWIFY WEBHOOK ERROR:", err);
    return res.status(500).json({ error: "webhook_failed" });
  }
}

module.exports = kiwifyWebhook;
