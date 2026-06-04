const SupportRequest = require('../models/SupportRequest');
const Project = require('../models/Project');
const User = require('../models/User');
const { awardPoints } = require('../services/gipEngine');
const Notification = require('../models/Notification');

// @desc    Get all support requests
// @route   GET /api/support
// @access  Private
const getSupportRequests = async (req, res) => {
  const { department, status, requester } = req.query;
  const filter = {};

  if (department) filter.department = department;
  if (status) filter.status = status;
  if (requester) filter.requester = requester;

  try {
    const requests = await SupportRequest.find(filter);
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(requests);
  } catch (err) {
    console.error('Error fetching support requests:', err);
    return res.status(500).json({ message: 'Server error fetching support requests' });
  }
};

// @desc    Create a new support request
// @route   POST /api/support
// @access  Private (Student)
const createSupportRequest = async (req, res) => {
  const { project, department, message } = req.body;

  if (!project || !department || !message) {
    return res.status(400).json({ message: 'Please provide project, department, and message' });
  }

  try {
    const request = await SupportRequest.create({
      project,
      requester: req.user._id || req.user.id,
      department,
      message,
      status: 'Pending',
      assignedTo: []
    });

    return res.status(201).json(request);
  } catch (err) {
    console.error('Error creating support request:', err);
    return res.status(500).json({ message: 'Server error creating support request' });
  }
};

// @desc    Assign support members to request (Department Head)
// @route   POST /api/support/:id/assign
// @access  Private (Department Head)
const assignSupport = async (req, res) => {
  const { assignedTo } = req.body; // Array of user IDs

  if (!assignedTo || !Array.isArray(assignedTo) || assignedTo.length === 0) {
    return res.status(400).json({ message: 'Please provide an array of assigned members' });
  }

  try {
    const request = await SupportRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Support request not found' });
    }

    // Resolve user objects for memoryDB fallback compatibility
    const User = require('../models/User');
    const memberObjects = [];
    for (const memberId of assignedTo) {
      const u = await User.findById(memberId);
      if (u) memberObjects.push(u);
    }

    const updated = await SupportRequest.findByIdAndUpdate(req.params.id, {
      status: 'Assigned',
      assignedTo: memberObjects.length > 0 ? memberObjects : assignedTo
    });

    // Award +20 GIP on support assignment
    const requesterId = request.requester._id || request.requester.id || request.requester;
    const projectId = request.project._id || request.project.id || request.project;

    await awardPoints(
      requesterId,
      projectId,
      20,
      `Department support assigned by ${req.user.name} for ${request.department}`
    );

    // Also update project's assignedMembers array
    const project = await Project.findById(projectId);
    if (project) {
      const currentAssigned = project.assignedMembers || [];
      const updatedMembers = [...currentAssigned, ...assignedTo];
      await Project.findByIdAndUpdate(projectId, { assignedMembers: updatedMembers });
    }

    await Notification.create({
      user: requesterId,
      title: 'Support Assigned! 🤝',
      message: `Your support request for "${project ? project.title : 'Project'}" has been assigned to department members! Earned +20 GIP.`
    });

    return res.json(updated);
  } catch (err) {
    console.error('Error assigning support:', err);
    return res.status(500).json({ message: 'Server error assigning support' });
  }
};

// @desc    Accept support request (marked active by team/head)
// @route   POST /api/support/:id/accept
// @access  Private
const acceptSupport = async (req, res) => {
  try {
    const request = await SupportRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Support request not found' });
    }

    const updated = await SupportRequest.findByIdAndUpdate(req.params.id, { status: 'Accepted' });

    const requesterId = request.requester._id || request.requester.id || request.requester;
    await Notification.create({
      user: requesterId,
      title: 'Support Request Accepted',
      message: `Department team has accepted and started work on your support request.`
    });

    return res.json(updated);
  } catch (err) {
    console.error('Error accepting support:', err);
    return res.status(500).json({ message: 'Server error accepting support request' });
  }
};

module.exports = {
  getSupportRequests,
  createSupportRequest,
  assignSupport,
  acceptSupport
};
