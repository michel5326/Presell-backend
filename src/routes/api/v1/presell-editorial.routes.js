const express = require("express");
const router = express.Router();

const { verifyWorker, verifyUser } = require("../../../middlewares/auth");
const {
  generateEditorialPresell,
} = require("../../../controllers/presell-editorial.controller");

// 🔓 LIBERA PREFLIGHT
router.options("/presell/editorial", (_, res) => {
  res.sendStatus(204);
});

router.post(
  "/presell/editorial",
  verifyWorker,
  verifyUser,
  generateEditorialPresell
);

module.exports = router;
