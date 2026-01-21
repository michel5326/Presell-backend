const express = require("express");
const kiwifyWebhook = require("../../../controllers/webhook.kiwify");
const caktoWebhook = require("../../../controllers/webhook.cakto");

const router = express.Router();

router.post("/webhooks/kiwify", express.json(), kiwifyWebhook);
router.post("/webhooks/cakto", express.json(), caktoWebhook);

module.exports = router;
