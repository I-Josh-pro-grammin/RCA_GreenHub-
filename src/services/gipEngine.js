const User = require('../models/User');
const Project = require('../models/Project');
const GreenImpactTransaction = require('../models/GreenImpactTransaction');

// Base point awards by category
const BASE_POINTS = {
  'Idea / Proposal': 25,
  'Web Platform': 50,
  'Embedded / IoT Project': 75,
  'RCA Campus Environment Action': 100,
  'Nyabihu District Community Project': 120
};

/**
 * Award Green Impact Points (GIP) to a user and project
 * @param {string} userId - ID of the user to receive points
 * @param {string} projectId - ID of the associated project (optional)
 * @param {number} points - Number of points to award
 * @param {string} reason - Description/reason for the award
 */
const awardPoints = async (userId, projectId, points, reason) => {
  try {
    if (!points || points <= 0) return null;

    // 1. Create transaction record
    const tx = await GreenImpactTransaction.create({
      user: userId,
      project: projectId || null,
      points,
      reason
    });

    // 2. Increment user points
    const user = await User.findById(userId);
    if (user) {
      const newPoints = (user.gipPoints || 0) + points;
      await User.findByIdAndUpdate(userId, { gipPoints: newPoints });
    }

    // 3. Increment project points (if applicable)
    if (projectId) {
      const project = await Project.findById(projectId);
      if (project) {
        const newProjPoints = (project.points || 0) + points;
        await Project.findByIdAndUpdate(projectId, { points: newProjPoints });
      }
    }

    console.log(`🏆 GIP Awarded: +${points} pts to User (${userId}) for "${reason}"`);
    return tx;
  } catch (err) {
    console.error('Error in GIP Engine:', err.message);
    throw err;
  }
};

module.exports = {
  BASE_POINTS,
  awardPoints
};
