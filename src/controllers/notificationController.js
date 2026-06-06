const Notification = require('../models/Notification');

// @desc    Get all notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const notifications = await Notification.find({ user: userId });
    
    // Sort newest first
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

// @desc    Mark specific notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id });
    if (!notification) {
      // Try with general id field for memoryDB fallback compatibility
      const notifFallback = await Notification.findOne({ id: req.params.id });
      if (!notifFallback) {
        return res.status(404).json({ message: 'Notification not found' });
      }
    }

    const notif = notification || await Notification.findOne({ id: req.params.id });
    const userId = req.user._id || req.user.id;
    const notifUser = notif.user._id || notif.user.id || notif.user;

    if (notifUser.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this notification' });
    }

    const idToUpdate = notif._id || notif.id;
    const updated = await Notification.findByIdAndUpdate(idToUpdate, { read: true });

    return res.json(updated);
  } catch (err) {
    console.error('Error marking notification read:', err);
    return res.status(500).json({ message: 'Server error marking notification read' });
  }
};

// @desc    Mark all user's notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const notifications = await Notification.find({ user: userId, read: false });

    const updated = [];
    for (const notif of notifications) {
      const idToUpdate = notif._id || notif.id;
      const up = await Notification.findByIdAndUpdate(idToUpdate, { read: true });
      updated.push(up);
    }

    return res.json({ message: 'All notifications marked as read', count: updated.length });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    return res.status(500).json({ message: 'Server error marking all notifications read' });
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead
};
