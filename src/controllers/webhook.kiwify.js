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

    // 3. criar ou reaproveitar usuário
    await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
    }).catch(() => {}); // ignora se já existir

    // 4. gerar link de acesso (recovery)
    const { data, error } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: "https://clickpage.vercel.app/login",
        },
      });

    if (error) throw error;

    // 5. (por enquanto) só logar o link
    console.log("LINK PARA O CLIENTE:", data.properties.action_link);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(500).json({ error: "webhook_failed" });
  }
}

module.exports = kiwifyWebhook;
