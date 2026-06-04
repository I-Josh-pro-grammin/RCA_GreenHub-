const Project = require('../models/Project');
const SupportRequest = require('../models/SupportRequest');
const Announcement = require('../models/Announcement');
const db = require('../models/db');
const memoryDB = require('../models/memoryDB');

// @desc    Global search across projects, support requests, and announcements
// @route   GET /api/search
// @access  Public
const search = async (req, res) => {
  const query = req.query.q || '';
  if (!query) {
    return res.json({ projects: [], supportRequests: [], announcements: [] });
  }

  try {
    let projects = [];
    let supportRequests = [];
    let announcements = [];

    if (db.isConnected()) {
      // MongoDB RegEx Search
      const searchRegex = new RegExp(query, 'i');
      projects = await Project.find({
        $or: [{ title: searchRegex }, { description: searchRegex }]
      });
      supportRequests = await SupportRequest.find({
        message: searchRegex
      });
      announcements = await Announcement.find({
        $or: [{ title: searchRegex }, { content: searchRegex }]
      });
    } else {
      // In-Memory Fallback RegEx Search
      const regex = new RegExp(query, 'i');
      const rawProjects = memoryDB.getRawCollection('projects');
      const rawSupports = memoryDB.getRawCollection('supportRequests');
      const rawAnnounce = memoryDB.getRawCollection('announcements');

      projects = rawProjects.filter(p => regex.test(p.title) || regex.test(p.description));
      supportRequests = rawSupports.filter(s => regex.test(s.message));
      announcements = rawAnnounce.filter(a => regex.test(a.title) || regex.test(a.content));
    }

    return res.json({ projects, supportRequests, announcements });
  } catch (err) {
    console.error('Search query error:', err);
    return res.status(500).json({ message: 'Server error processing search' });
  }
};

module.exports = {
  search
};
