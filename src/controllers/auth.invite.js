const { supabaseAdmin } = require("../services/supabase");

async function inviteUser(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email_required" });
    }

    // 1) verifica se o usuário tem acesso válido
    const { data: access, error: accessError } = await supabaseAdmin
      .from("user_access")
      .select("access_until")
      .eq("email", email)
      .single();

    if (accessError || !access || new Date(access.access_until) < new Date()) {
      return res.status(403).json({ error: "access_denied" });
    }

    // 2) tenta enviar invite (CRIA o usuário se não existir)
    const { error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: "https://clickpage.vercel.app/login",
      });

    // 👉 se o invite FUNCIONOU, não faz mais nada
    if (!inviteError) {
      return res.status(200).json({ ok: true });
    }

    // 3) se o invite falhou, o usuário JÁ existe → envia recovery
    const { error: recoveryError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: "https://clickpage.vercel.app/login",
        },
      });

    if (recoveryError) {
      throw recoveryError;
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("INVITE ERROR:", err);
    return res.status(500).json({ error: "invite_failed" });
  }
}

module.exports = inviteUser;
