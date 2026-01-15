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

    // 2) tenta enviar invite
    const { error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: "https://clickpage.vercel.app/login",
      });

    // 3) se o usuário já existir, envia recovery
    if (inviteError) {
      const { error: recoveryError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: "https://clickpage.vercel.app/login",
          },
        });

      if (recoveryError) throw recoveryError;
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("INVITE ERROR FULL:", {
      message: err && err.message,
      status: err && err.status,
      error: err && err.error,
      details: err && err.details,
      raw: err,
    });

    return res.status(500).json({ error: "invite_failed" });
  }
}

module.exports = inviteUser;
