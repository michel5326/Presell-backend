const { supabaseAdmin } = require("../services/supabase");

function verifyWorker(req, res, next) {
  const token = req.headers["x-worker-token"];
  if (token !== process.env.WORKER_TOKEN) {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}

async function verifyUser(req, res, next) {
  try {
    const email = req.headers["x-user-email"];
    if (!email) return res.status(401).json({ error: "no user" });

    const { data: access, error } = await supabaseAdmin
      .from("user_access")
      .select("access_until")
      .eq("email", email)
      .single();

    if (error || !access || new Date(access.access_until) < new Date()) {
      return res.status(403).json({ error: "expired" });
    }

    next();
  } catch {
    return res.status(500).json({ error: "internal_error" });
  }
}

module.exports = { verifyWorker, verifyUser };
