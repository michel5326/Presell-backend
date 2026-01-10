require("dotenv").config();

const express = require("express");
const cors = require("cors");

const v1Routes = require("./routes/api/v1");

const app = express();

/* =========================
   CORS (OBRIGATÓRIO)
========================= */
const corsOptions = {
  origin: "https://clickpage.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "x-worker-token",
    "x-user-email",
  ],
};

app.use(cors(corsOptions));

/**
 * ⚠️ IMPORTANTE
 * Responde explicitamente preflight OPTIONS
 */
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
