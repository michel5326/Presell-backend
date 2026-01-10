const express = require("express");
const router = express.Router();

const { generatePresellData } = require("../../../controllers/presell.controller");
const { verifyWorker, verifyUser } = require("../../../middlewares/auth");

// 🔓 LIBERA PREFLIGHT
router.options("/generate-data", (req, res) => {
  res.sendStatus(204);
});

router.post(
  "/generate-data",
  verifyWorker,
  verifyUser,
  generatePresellData
);

module.exports = router;
