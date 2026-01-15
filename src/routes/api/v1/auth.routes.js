const express = require("express");
const inviteUser = require("../../../controllers/auth.invite");

const router = express.Router();

router.post("/auth/invite", express.json(), inviteUser);

module.exports = router;
