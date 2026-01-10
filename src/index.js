require("dotenv").config();

const express = require("express");
const cors = require("cors");

const v1Routes = require("./routes/api/v1");

const app = express();

/* =========================
   CORS (MODELO ESTÁVEL)
========================= */
app.use(
  cors({
    origin: [
      "https://clickpage.vercel.app",
      "https://clickpage.lovable.app",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:8080",
      "http://localhost:3000",
    ],
    methods: ["POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "x-worker-token",
      "x-user-email",
    ],
  })
);

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
