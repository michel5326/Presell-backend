const { supabaseAdmin } = require("../services/supabase");

async function inviteUser(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email_required" });
    }

    // 1) verifica acesso
    const { data: access, error: accessError } = await supabaseAdmin
      .from("user_access")
      .select("access_until")
      .eq("email", email)
      .single();

    if (accessError || !access || new Date(access.access_until) < new Date()) {
      return res.status(403).json({ error: "access_denied" });
    }

    // 2) tenta invite (cria usuário se não existir)
    const { error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: "https://clickpage.vercel.app/login",
      });

    // 3) se invite falhar, tenta recovery
    if (inviteError) {
      const { error: recoveryError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: "https://clickpage.vercel.app/login",
          },
        });

      // 404 = usuário ainda não existe → ok
      if (recoveryError && recoveryError.status !== 404) {
        throw recoveryError;
      }
    }

    // 4) sempre sucesso se chegou até aqui
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("INVITE ERROR:", err);
    return res.status(500).json({ error: "invite_failed" });
  }
}

module.exports = inviteUser;
