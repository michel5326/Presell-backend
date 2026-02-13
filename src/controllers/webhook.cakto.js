const { supabaseAdmin } = require("../services/supabase");

async function caktoWebhook(req, res) {
  try {
    const body = req.body;
    const payload = body?.payload || body;

    const eventType = payload?.event;
    const secret = payload?.secret;

    if (secret !== process.env.CAKTO_SECRET) {
      return res.status(401).json({ error: "invalid_secret" });
    }

    const email = payload?.data?.customer?.email?.trim().toLowerCase();

    if (!email) {
      return res.status(200).json({ ok: true, no_email: true });
    }

    /* ===============================
       ✅ COMPRA APROVADA
    =============================== */
    if (eventType === "purchase_approved") {
      await supabaseAdmin.auth.admin
        .createUser({ email, email_confirm: true })
        .catch(() => {});

      const accessUntil = new Date();
      accessUntil.setMonth(accessUntil.getMonth() + 1); // 🔥 1 MÊS
      accessUntil.setHours(23, 59, 59, 999);

      await supabaseAdmin
        .from("user_access")
        .upsert(
          {
            email,
            access_until: accessUntil.toISOString(),
          },
          { onConflict: "email" }
        );

      await supabaseAdmin.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: "https://clickpage.vercel.app/reset-password",
        },
      });

      return res.status(200).json({ ok: true, type: "approved" });
    }

    /* ===============================
       🔥 REEMBOLSO
    =============================== */
    if (eventType === "purchase_refunded") {
      await supabaseAdmin
        .from("user_access")
        .delete()
        .eq("email", email);

      return res.status(200).json({ ok: true, type: "refunded" });
    }

    return res.status(200).json({ ok: true, ignored: true });

  } catch (err) {
    console.error("CAKTO WEBHOOK ERROR:", err);
    return res.status(500).json({ error: "webhook_failed" });
  }
}

module.exports = caktoWebhook;
