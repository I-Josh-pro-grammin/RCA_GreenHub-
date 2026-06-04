const Announcement = require('../models/Announcement');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Public
const getAnnouncements = async (req, res) => {
  const { visibility } = req.query;
  const filter = {};

  if (visibility) {
    filter.visibility = visibility;
  }

  try {
    const announcements = await Announcement.find(filter);
    announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(announcements);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    return res.status(500).json({ message: 'Server error fetching announcements' });
  }
};

// @desc    Create a new announcement
// @route   POST /api/announcements
// @access  Private (Secretary)
const createAnnouncement = async (req, res) => {
  const { title, content, visibility } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Please provide title and content' });
  }

  try {
    const announcement = await Announcement.create({
      title,
      content,
      visibility: visibility || 'Internal',
      author: req.user._id || req.user.id
    });

    return res.status(201).json(announcement);
  } catch (err) {
    console.error('Error creating announcement:', err);
    return res.status(500).json({ message: 'Server error creating announcement' });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement
};
