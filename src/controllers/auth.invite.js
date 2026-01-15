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
