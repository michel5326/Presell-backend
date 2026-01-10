const express = require("express");
const { verifyWorker, verifyUser } = require("../middlewares/auth");
const legacyController = require("../controllers/legacy.controller");

const router = express.Router();

router.post(
  "/generate",
  verifyWorker,
  verifyUser,
  legacyController
);

module.exports = router;
