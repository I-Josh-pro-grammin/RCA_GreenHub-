const BudgetRequest = require('../models/BudgetRequest');
const { awardPoints } = require('../services/gipEngine');
const Notification = require('../models/Notification');

// @desc    Get all budget requests
// @route   GET /api/budgets
// @access  Private (Finance Officer, Department Head, Secretary, Head of All Departments)
const getBudgets = async (req, res) => {
  try {
    const requests = await BudgetRequest.find({});
    // Sort newest first
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(requests);
  } catch (err) {
    console.error('Error fetching budget requests:', err);
    return res.status(500).json({ message: 'Server error fetching budget requests' });
  }
};

// @desc    Create a new budget request
// @route   POST /api/budgets
// @access  Private
const createBudget = async (req, res) => {
  const { project, amount, reason } = req.body;

  if (!amount || !reason) {
    return res.status(400).json({ message: 'Please provide amount and reason' });
  }

  try {
    const request = await BudgetRequest.create({
      project: project || null,
      requestedBy: req.user._id || req.user.id,
      amount,
      reason,
      status: 'Pending'
    });

    return res.status(201).json(request);
  } catch (err) {
    console.error('Error creating budget request:', err);
    return res.status(500).json({ message: 'Server error creating budget request' });
  }
};

// @desc    Approve a budget request
// @route   POST /api/budgets/:id/approve
// @access  Private (Finance Officer / Finance)
const approveBudget = async (req, res) => {
  try {
    const request = await BudgetRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Budget request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ message: `Request is already ${request.status.toLowerCase()}` });
    }

    const updated = await BudgetRequest.findByIdAndUpdate(req.params.id, { status: 'Approved' });

    // Award +25 GIP points on budget approval
    const requesterId = request.requestedBy._id || request.requestedBy.id || request.requestedBy;
    const projectId = request.project ? (request.project._id || request.project.id || request.project) : null;

    await awardPoints(
      requesterId,
      projectId,
      25,
      `Budget request of RWF ${request.amount} approved by Finance`
    );

    await Notification.create({
      user: requesterId,
      title: 'Budget Approved! 💰',
      message: `Your budget request of RWF ${request.amount.toLocaleString()} was approved by Finance Officer! Earned +25 GIP.`
    });

    return res.json(updated);
  } catch (err) {
    console.error('Error approving budget request:', err);
    return res.status(500).json({ message: 'Server error approving budget request' });
  }
};

// @desc    Reject a budget request
// @route   POST /api/budgets/:id/reject
// @access  Private (Finance Officer / Finance)
const rejectBudget = async (req, res) => {
  try {
    const request = await BudgetRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Budget request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ message: `Request is already ${request.status.toLowerCase()}` });
    }

    const updated = await BudgetRequest.findByIdAndUpdate(req.params.id, { status: 'Rejected' });

    const requesterId = request.requestedBy._id || request.requestedBy.id || request.requestedBy;
    await Notification.create({
      user: requesterId,
      title: 'Budget Request Rejected',
      message: `Your budget request of RWF ${request.amount.toLocaleString()} was declined by Finance Officer.`
    });

    return res.json(updated);
  } catch (err) {
    console.error('Error rejecting budget request:', err);
    return res.status(500).json({ message: 'Server error rejecting budget request' });
  }
};

module.exports = {
  getBudgets,
  createBudget,
  approveBudget,
  rejectBudget
};
