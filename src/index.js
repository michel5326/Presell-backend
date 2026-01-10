require("dotenv").config();

const express = require("express");
const cors = require("cors");

const v1Routes = require("./routes/api/v1");

const app = express();

/* =========================
   CORS (VERSÃO ROBUSTA)
   - Aceita domínios Vercel
   - Funciona com preflight
========================= */
const corsOptions = {
  origin: function (origin, callback) {
    // Permite chamadas sem origin (curl, server-to-server)
    if (!origin) return callback(null, true);

    // Libera qualquer subdomínio da Vercel
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    // Bloqueia o resto
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "x-worker-token",
    "x-user-email",
  ],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* =========================
   MIDDLEWARES GLOBAIS
========================= */
app.use(express.json());

/* =========================
   API v1
========================= */
app.use("/api/v1", v1Routes);

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});
