const { supabaseAdmin } = require("../services/supabase");

async function kiwifyWebhook(req, res) {
  try {
    const body = req.body;

    // 1. validar evento correto
    const eventType = body?.order?.webhook_event_type;
    if (eventType !== "order_approved") {
      return res.status(200).json({ ok: true, ignored: true });
    }

    // 2. pegar email corretamente
    const email = body?.order?.Customer?.email;
    if (!email) {
      return res.status(400).json({ error: "email_missing" });
    }

    // 3. criar usuário (idempotente)
    await supabaseAdmin.auth.admin
      .createUser({
        email,
        email_confirm: true,
      })
      .catch(() => {});

    // 4. definir acesso por 6 meses
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

    // 5. gerar link de acesso (recovery)
    const { data, error } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: "https://clickpage.vercel.app/login",
        },
      });

    if (error) throw error;

    // 6. log do link (temporário)
    console.log("KIWIFY CLIENT ACCESS LINK:", data.properties.action_link);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("KIWIFY WEBHOOK ERROR:", err.message);
    return res.status(500).json({ error: "webhook_failed" });
  }
}

module.exports = kiwifyWebhook;
