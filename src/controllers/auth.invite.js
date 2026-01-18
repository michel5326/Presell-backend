const { supabaseAdmin } = require("../services/supabase");

async function inviteUser(req, res) {
  try {
    // normalização obrigatória
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

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

    // 2) envia MAGIC LINK
    const redirectTo = "https://clickpage.vercel.app/reset-password";

    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      console.error("MAGIC LINK ERROR:", error);
      return res.status(500).json({ error: "magic_link_failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("INVITE ERROR:", err);
    return res.status(500).json({ error: "internal_error" });
  }
}

module.exports = inviteUser;
