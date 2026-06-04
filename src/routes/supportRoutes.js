const express = require('express');
const router = express.Router();
const { getSupportRequests, createSupportRequest, assignSupport, acceptSupport } = require('../controllers/supportController');
const protect = require('../middleware/authMiddleware');

router.get('/', protect, getSupportRequests);
router.post('/', protect, createSupportRequest);
router.post('/:id/assign', protect, assignSupport);
router.post('/:id/accept', protect, acceptSupport);

module.exports = router;
