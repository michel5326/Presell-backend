const express = require('express');
const { generateGoogleAdsController } = require('./controller/generateGoogleAds.controller');

const router = express.Router();

router.post('/search', generateGoogleAdsController);

module.exports = router;
