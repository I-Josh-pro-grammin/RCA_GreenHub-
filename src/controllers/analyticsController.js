const Project = require('../models/Project');
const User = require('../models/User');
const SupportRequest = require('../models/SupportRequest');
const BudgetRequest = require('../models/BudgetRequest');
const GreenImpactTransaction = require('../models/GreenImpactTransaction');
const Announcement = require('../models/Announcement');
const db = require('../models/db');
const memoryDB = require('../models/memoryDB');

// Helper to sum points
const sumPoints = (list) => list.reduce((sum, item) => sum + (item.points || 0), 0);

// Helper to sum user GIP points
const sumUserPoints = (list) => list.reduce((sum, item) => sum + (item.gipPoints || 0), 0);

// @desc    Get overall analytics for Landing Page
// @route   GET /api/analytics/overall
// @access  Public
const getOverallAnalytics = async (req, res) => {
  try {
    let projects = [];
    let users = [];
    let transactions = [];

    if (db.isConnected()) {
      projects = await Project.find({});
      users = await User.find({});
      transactions = await GreenImpactTransaction.find({}).populate('user').populate('project');
    } else {
      projects = memoryDB.getRawCollection('projects');
      users = memoryDB.getRawCollection('users');
      transactions = memoryDB.getRawCollection('transactions');
    }

    // Sort transactions by date descending, take top 5
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentGipLogs = transactions.slice(0, 5).map(tx => ({
      label: tx.reason,
      value: `+${tx.points} pts`,
      meta: tx.user?.name || 'User'
    }));

    // Top projects
    projects.sort((a, b) => (b.points || 0) - (a.points || 0));
    const topProjects = projects.slice(0, 3).map(p => ({
      title: p.title,
      value: `${p.points || 0} pts`,
      meta: p.category
    }));

    // Category breakdown counts
    const categories = ["Web Platform", "Embedded / IoT Project", "RCA Campus Environment Action", "Nyabihu District Community Project", "Idea / Proposal"];
    const categoryCounts = categories.map(cat => ({
      category: cat,
      count: projects.filter(p => p.category === cat).length
    }));

    const totalGIP = sumUserPoints(users) || 3420; // fallback to static total if new DB

    return res.json({
      totalProjects: projects.length,
      totalGIP,
      recentGipLogs,
      topProjects,
      categoryCounts
    });
  } catch (err) {
    console.error('Error computing overall analytics:', err);
    return res.status(500).json({ message: 'Server error computing analytics' });
  }
};

// @desc    Get role-specific dashboard metrics
// @route   GET /api/analytics/portal
// @access  Private
const getPortalAnalytics = async (req, res) => {
  const userId = req.user._id || req.user.id;
  const role = req.user.role;

  try {
    let projects = [];
    let supportRequests = [];
    let budgetRequests = [];
    let announcements = [];

    if (db.isConnected()) {
      projects = await Project.find({});
      supportRequests = await SupportRequest.find({});
      budgetRequests = await BudgetRequest.find({});
      announcements = await Announcement.find({});
    } else {
      projects = memoryDB.getRawCollection('projects');
      supportRequests = memoryDB.getRawCollection('supportRequests');
      budgetRequests = memoryDB.getRawCollection('budgetRequests');
      announcements = memoryDB.getRawCollection('announcements');
    }

    const stats = [];

    if (role === 'Student') {
      const myProjects = projects.filter(p => (p.author._id || p.author.id || p.author) === userId);
      const myRequests = supportRequests.filter(s => (s.requester._id || s.requester.id || s.requester) === userId);
      stats.push(
        { label: 'My Projects', value: myProjects.length },
        { label: 'Support Requests', value: myRequests.length },
        { label: 'Rank', value: 'Silver 🥈' }
      );
    } else if (role === 'Teacher') {
      const pendingReviews = projects.filter(p => p.status === 'Pending');
      const endorsedByMe = projects.filter(p => p.isEndorsed && (p.endorsedBy?._id || p.endorsedBy?.id || p.endorsedBy) === userId);
      stats.push(
        { label: 'Pending Reviews', value: pendingReviews.length },
        { label: 'Endorsed Projects', value: endorsedByMe.length }
      );
    } else if (role.includes('Department Head')) {
      let deptName = '';
      if (role.startsWith('Web')) deptName = 'Web Development';
      else if (role.startsWith('Embedded')) deptName = 'Embedded Systems';
      else deptName = 'School & Community Environment';

      const deptSupports = supportRequests.filter(s => s.department === deptName);
      const pendingSupports = deptSupports.filter(s => s.status === 'Pending');
      const activeSupports = deptSupports.filter(s => s.status === 'Assigned' || s.status === 'Accepted');

      stats.push(
        { label: 'Pending Requests', value: pendingSupports.length },
        { label: 'Active Support', value: activeSupports.length }
      );
    } else if (role === 'Finance Officer') {
      const pendingBudgets = budgetRequests.filter(b => b.status === 'Pending');
      const approvedBudgets = budgetRequests.filter(b => b.status === 'Approved');
      const totalRequested = approvedBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);

      stats.push(
        { label: 'Pending Budgets', value: pendingBudgets.length },
        { label: 'Approved Spending', value: `RWF ${totalRequested.toLocaleString()}` }
      );
    } else if (role === 'Secretary') {
      stats.push(
        { label: 'Total Announcements', value: announcements.length },
        { label: 'Active Meetings', value: 3 }
      );
    } else if (role === 'Head of All Departments') {
      const pendingSupportTotal = supportRequests.filter(s => s.status === 'Pending');
      stats.push(
        { label: 'All Projects', value: projects.length },
        { label: 'Pending Support', value: pendingSupportTotal.length }
      );
    } else if (role === 'Investor / Partner') {
      const publicProjects = projects.filter(p => p.status === 'Approved' || p.status === 'Featured');
      stats.push(
        { label: 'Approved Projects', value: publicProjects.length },
        { label: 'Impact Score', value: 'High' }
      );
    }

    return res.json({ stats });
  } catch (err) {
    console.error('Error fetching portal stats:', err);
    return res.status(500).json({ message: 'Server error computing dashboard metrics' });
  }
};

module.exports = {
  getOverallAnalytics,
  getPortalAnalytics
};
