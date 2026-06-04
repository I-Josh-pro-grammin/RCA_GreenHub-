const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  endorseProject,
  recommendProject,
  markProjectReady,
  featureProject
} = require('../controllers/projectController');
const protect = require('../middleware/authMiddleware');

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', protect, createProject);
router.post('/:id/endorse', protect, endorseProject);
router.post('/:id/recommend', protect, recommendProject);
router.post('/:id/ready', protect, markProjectReady);
router.post('/:id/feature', protect, featureProject);

module.exports = router;
