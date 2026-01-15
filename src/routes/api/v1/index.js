const express = require("express");
const router = express.Router();

const generateRoutes = require("./generate.routes");
const webhookRoutes = require("./webhook.routes");
const healthRoutes = require("./health.routes");
const aiTestRoutes = require("./ai-test.routes");
const generateDataRoutes = require("./generate-data.routes");
const presellEditorialRoutes = require("./presell-editorial.routes");
const authRoutes = require("./auth.routes");

router.use(generateRoutes);
router.use(webhookRoutes);
router.use(healthRoutes);
router.use(aiTestRoutes);
router.use(generateDataRoutes);
router.use(presellEditorialRoutes);
router.use(authRoutes);

module.exports = router;
