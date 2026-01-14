const express = require("express");
const kiwifyWebhook = require("../../../controllers/webhook.kiwify");

const router = express.Router();

router.post("/webhooks/kiwify", express.json(), kiwifyWebhook);

module.exports = router;
