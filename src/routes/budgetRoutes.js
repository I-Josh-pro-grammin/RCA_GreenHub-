const express = require('express');
const router = express.Router();
const { getBudgets, createBudget, approveBudget, rejectBudget } = require('../controllers/budgetController');
const protect = require('../middleware/authMiddleware');

router.get('/', protect, getBudgets);
router.post('/', protect, createBudget);
router.post('/:id/approve', protect, approveBudget);
router.post('/:id/reject', protect, rejectBudget);

module.exports = router;
