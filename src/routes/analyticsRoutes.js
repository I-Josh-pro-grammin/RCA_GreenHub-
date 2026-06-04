const express = require('express');
const router = express.Router();
const { getOverallAnalytics, getPortalAnalytics } = require('../controllers/analyticsController');
const protect = require('../middleware/authMiddleware');

router.get('/overall', getOverallAnalytics);
router.get('/portal', protect, getPortalAnalytics);

module.exports = router;
