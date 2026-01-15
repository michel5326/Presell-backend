const { supabaseAdmin } = require("../services/supabase");

async function inviteUser(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email_required" });
    }

    // 1) verifica se o usuário tem acesso válido
    const { data: access } = await supabaseAdmin
      .from("user_access")
      .select("access_until")
      .eq("email", email)
      .single();

    if (!access || new Date(access.access_until) < new Date()) {
      return res.status(403).json({ error: "access_denied" });
    }

    // 2) envia o invite (Supabase envia o email)
    const { error } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: "https://clickpage.vercel.app/login",
      });

    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("INVITE ERROR:", err.message);
    return res.status(500).json({ error: "invite_failed" });
  }
}

module.exports = inviteUser;
