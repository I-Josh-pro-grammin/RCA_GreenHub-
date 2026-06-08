const Project = require('../models/Project');
const { awardPoints, BASE_POINTS } = require('../services/gipEngine');
const Notification = require('../models/Notification');

// Helper to broadcast notification via Socket.io if available
const sendNotification = async (userId, title, message) => {
  try {
    await Notification.create({ user: userId, title, message });
    // In a real socket setup we would emit here, handled in app.js
  } catch (err) {
    console.error('Notification creation failed:', err.message);
  }
};

// @desc    Get all projects (with optional filters)
// @route   GET /api/projects
// @access  Public
const getProjects = async (req, res) => {
  const { category, department, status, author, stage, isEndorsed, isFeatured, isRecommendedForSupport, isRecommendedForInvestors } = req.query;
  const filter = {};

  if (category) filter.category = category;
  if (department) filter.department = department;
  if (status) filter.status = status;
  if (author) filter.author = author;
  if (stage) filter.stage = stage;
  if (isEndorsed !== undefined) filter.isEndorsed = isEndorsed === 'true';
  if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';
  if (isRecommendedForSupport !== undefined) filter.isRecommendedForSupport = isRecommendedForSupport === 'true';
  if (isRecommendedForInvestors !== undefined) filter.isRecommendedForInvestors = isRecommendedForInvestors === 'true';

  try {
    const projects = await Project.find(filter);
    // Sort newest first
    projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    return res.status(500).json({ message: 'Server error fetching projects' });
  }
};

// @desc    Get a single project by ID
// @route   GET /api/projects/:id
// @access  Public
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    return res.json(project);
  } catch (err) {
    console.error('Error fetching project by ID:', err);
    return res.status(500).json({ message: 'Server error fetching project detail' });
  }
};

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private (Student)
const createProject = async (req, res) => {
  const { title, description, category, department, stage, targetArea, githubLink, liveDemo, supportNeeded } = req.body;

  if (!title || !category || !department) {
    return res.status(400).json({ message: 'Please provide title, category, and department' });
  }

  try {
    const baseGip = BASE_POINTS[category] || 25;

    const project = await Project.create({
      title,
      description,
      category,
      department,
      stage: stage || 'Idea',
      targetArea: targetArea || 'RCA Campus',
      githubLink: githubLink || '',
      liveDemo: liveDemo || '',
      supportNeeded: supportNeeded || [],
      points: baseGip,
      status: 'Pending',
      author: req.user._id || req.user.id
    });

    // Award base GIP to student
    await awardPoints(req.user._id || req.user.id, project._id || project.id, baseGip, `Base points for creating a new ${category}`);

    await sendNotification(
      req.user._id || req.user.id,
      'Project Submitted',
      `Your project "${title}" was successfully submitted! Earned +${baseGip} GIP base points.`
    );

    return res.status(201).json(project);
  } catch (err) {
    console.error('Error creating project:', err);
    return res.status(500).json({ message: 'Server error creating project' });
  }
};

// @desc    Endorse a project
// @route   POST /api/projects/:id/endorse
// @access  Private (Teacher)
const endorseProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.isEndorsed) {
      return res.status(400).json({ message: 'Project is already endorsed' });
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, {
      isEndorsed: true,
      endorsedBy: req.user._id || req.user.id,
      status: 'Approved'
    });

    const endorsementGip = 35; // points awarded on endorsement
    const authorId = project.author._id || project.author.id || project.author;

    // Award points to the student author
    await awardPoints(authorId, project._id || project.id, endorsementGip, `Teacher endorsement by ${req.user.name}`);

    await sendNotification(
      authorId,
      'Project Endorsed! 🎉',
      `Your project "${project.title}" has been endorsed by ${req.user.name}! Earned +${endorsementGip} GIP.`
    );

    // Award +20 GIP to the teacher
    await awardPoints(req.user._id || req.user.id, project._id || project.id, 20, `Endorsed project: ${project.title}`);

    // Notify the teacher
    await sendNotification(
      req.user._id || req.user.id,
      'Points Earned! 🏆',
      `You earned +20 GIP for endorsing the project "${project.title}".`
    );

    return res.json(updated);
  } catch (err) {
    console.error('Error endorsing project:', err);
    return res.status(500).json({ message: 'Server error endorsing project' });
  }
};

// @desc    Recommend a project for support or investors
// @route   POST /api/projects/:id/recommend
// @access  Private (Teacher, Department Head)
const recommendProject = async (req, res) => {
  const { type } = req.body; // 'support' or 'investor'
  if (!type || (type !== 'support' && type !== 'investor')) {
    return res.status(400).json({ message: 'Provide recommendation type: support or investor' });
  }

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const updates = {};
    let gipAward = 25;
    let reason = '';

    if (type === 'support') {
      if (project.isRecommendedForSupport) {
        return res.status(400).json({ message: 'Project already recommended for support' });
      }
      updates.isRecommendedForSupport = true;
      reason = 'Recommended for department support';
    } else {
      if (project.isRecommendedForInvestors) {
        return res.status(400).json({ message: 'Project already recommended for investors' });
      }
      updates.isRecommendedForInvestors = true;
      reason = 'Recommended for investor discovery';
      gipAward = 40; // higher reward for investor placement
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, updates);
    const authorId = project.author._id || project.author.id || project.author;

    await awardPoints(authorId, project._id || project.id, gipAward, `${reason} by ${req.user.name}`);

    await sendNotification(
      authorId,
      'Project Recommended',
      `Your project "${project.title}" was ${reason.toLowerCase()}. Earned +${gipAward} GIP.`
    );

    // Award +15 GIP to the teacher/head
    await awardPoints(req.user._id || req.user.id, project._id || project.id, 15, `Recommended project "${project.title}" for ${type}`);

    // Notify the recommender
    await sendNotification(
      req.user._id || req.user.id,
      'Points Earned! 🏆',
      `You earned +15 GIP for recommending "${project.title}" for ${type === 'support' ? 'Department Support' : 'Investor Discovery'}.`
    );

    return res.json(updated);
  } catch (err) {
    console.error('Error recommending project:', err);
    return res.status(500).json({ message: 'Server error recommending project' });
  }
};

// @desc    Mark project ready (Department Head)
// @route   POST /api/projects/:id/ready
// @access  Private (Department Head)
const markProjectReady = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, {
      stage: 'Prototype',
      status: 'Approved'
    });

    const completionGip = 45;
    const authorId = project.author._id || project.author.id || project.author;

    await awardPoints(authorId, project._id || project.id, completionGip, `Prototype marked ready by ${req.user.name}`);

    await sendNotification(
      authorId,
      'Prototype Ready!',
      `Department Head ${req.user.name} marked your prototype as ready! Earned +${completionGip} GIP.`
    );

    return res.json(updated);
  } catch (err) {
    console.error('Error marking project ready:', err);
    return res.status(500).json({ message: 'Server error updating project status' });
  }
};

// @desc    Feature project (Head of All Departments)
// @route   POST /api/projects/:id/feature
// @access  Private (Head of All Departments)
const featureProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.isFeatured) {
      return res.status(400).json({ message: 'Project is already featured' });
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, {
      isFeatured: true,
      status: 'Featured'
    });

    const featureGip = 50;
    const authorId = project.author._id || project.author.id || project.author;

    await awardPoints(authorId, project._id || project.id, featureGip, `Featured on GreenHub home by Head of Departments`);

    await sendNotification(
      authorId,
      'Featured Project! 🌟',
      `Awesome! Your project "${project.title}" has been Featured on GreenHubRCA home! Earned +${featureGip} GIP.`
    );

    return res.json(updated);
  } catch (err) {
    console.error('Error featuring project:', err);
    return res.status(500).json({ message: 'Server error featuring project' });
  }
};

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private (Author)
const updateProject = async (req, res) => {
  const { title, description, category, department, stage, targetArea, githubLink, liveDemo, supportNeeded } = req.body;

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization: only the creator can edit
    const authorId = project.author._id || project.author.id || project.author;
    const userId = req.user._id || req.user.id;
    if (authorId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this project' });
    }

    let points = project.points;
    if (category && category !== project.category) {
      const oldBase = BASE_POINTS[project.category] || 25;
      const newBase = BASE_POINTS[category] || 25;
      const diff = newBase - oldBase;
      points = Math.max(0, (project.points || 0) + diff);
      
      // Update User total GIP points
      const User = require('../models/User');
      const authorUser = await User.findById(authorId);
      if (authorUser) {
        const newUserPoints = Math.max(0, (authorUser.gipPoints || 0) + diff);
        await User.findByIdAndUpdate(authorId, { gipPoints: newUserPoints });
      }

      // Generate a notification about GIP update
      const sign = diff >= 0 ? '+' : '';
      await sendNotification(
        authorId,
        'Points Adjusted',
        `Your project "${title || project.title}" category was updated. GIP adjusted by ${sign}${diff} points.`
      );
    }

    const updates = {
      title: title !== undefined ? title : project.title,
      description: description !== undefined ? description : project.description,
      category: category !== undefined ? category : project.category,
      department: department !== undefined ? department : project.department,
      stage: stage !== undefined ? stage : project.stage,
      targetArea: targetArea !== undefined ? targetArea : project.targetArea,
      githubLink: githubLink !== undefined ? githubLink : project.githubLink,
      liveDemo: liveDemo !== undefined ? liveDemo : project.liveDemo,
      supportNeeded: supportNeeded !== undefined ? supportNeeded : project.supportNeeded,
      points: points
    };

    const updatedProject = await Project.findByIdAndUpdate(req.params.id, updates);

    return res.json(updatedProject);
  } catch (err) {
    console.error('Error updating project:', err);
    return res.status(500).json({ message: 'Server error updating project' });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private (Author)
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization: only the creator can delete
    const authorId = project.author._id || project.author.id || project.author;
    const userId = req.user._id || req.user.id;
    if (authorId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this project' });
    }

    // 1. Deduct project points from user's GIP points
    const User = require('../models/User');
    const user = await User.findById(authorId);
    if (user) {
      const newGip = Math.max(0, (user.gipPoints || 0) - (project.points || 0));
      await User.findByIdAndUpdate(authorId, { gipPoints: newGip });
    }

    // 2. Clean up associated support requests
    const db = require('../models/db');
    const memoryDB = require('../models/memoryDB');
    if (db.isConnected()) {
      const SupportRequest = require('../models/SupportRequest');
      await SupportRequest.model.deleteMany({ project: project._id });
    } else {
      const supportList = memoryDB.getRawCollection('supportRequests');
      for (let i = supportList.length - 1; i >= 0; i--) {
        const pId = supportList[i].project?._id || supportList[i].project?.id || supportList[i].project;
        if (pId && pId.toString() === req.params.id.toString()) {
          supportList.splice(i, 1);
        }
      }
    }

    // 3. Clean up associated budget requests
    if (db.isConnected()) {
      const BudgetRequest = require('../models/BudgetRequest');
      await BudgetRequest.model.deleteMany({ project: project._id });
    } else {
      const budgetList = memoryDB.getRawCollection('budgetRequests');
      for (let i = budgetList.length - 1; i >= 0; i--) {
        const pId = budgetList[i].project?._id || budgetList[i].project?.id || budgetList[i].project;
        if (pId && pId.toString() === req.params.id.toString()) {
          budgetList.splice(i, 1);
        }
      }
    }

    // 4. Delete the project itself
    if (db.isConnected()) {
      const mongoose = require('mongoose');
      const ProjectModel = mongoose.models.Project || mongoose.model('Project');
      await ProjectModel.findByIdAndDelete(req.params.id);
    } else {
      await memoryDB.deleteOne('projects', req.params.id);
    }

    // Emit socket or save notification
    await sendNotification(
      userId,
      'Project Deleted',
      `Your project "${project.title}" has been deleted. -${project.points || 0} GIP points were deducted.`
    );

    return res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Error deleting project:', err);
    return res.status(500).json({ message: 'Server error deleting project' });
  }
};

// @desc    Add a comment to a project
// @route   POST /api/projects/:id/comments
// @access  Private
const addComment = async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Comment content is required' });
  }

  try {
    const db = require('../models/db');
    const memoryDB = require('../models/memoryDB');
    const User = require('../models/User');

    if (db.isConnected()) {
      const mongoose = require('mongoose');
      const ProjectModel = mongoose.models.Project || mongoose.model('Project');
      const project = await ProjectModel.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      project.comments.push({
        user: req.user._id || req.user.id,
        content: content.trim()
      });

      await project.save();

      // Notify the project author (if the commenter is not the author)
      const authorId = project.author;
      const commenterId = req.user._id || req.user.id;
      const commenterName = req.user.name || 'A user';
      if (authorId && authorId.toString() !== commenterId.toString()) {
        await sendNotification(
          authorId,
          'New Comment',
          `"${commenterName}" commented on your project "${project.title}".`
        );
      }

      // Retrieve full project with populated comments
      const updatedProject = await ProjectModel.findById(req.params.id)
        .populate('author')
        .populate('endorsedBy')
        .populate('assignedMembers')
        .populate('comments.user');

      return res.json(updatedProject);
    } else {
      // memoryDB mode
      const project = await memoryDB.findById('projects', req.params.id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const currentUser = await User.findById(req.user._id || req.user.id);

      if (!project.comments) {
        project.comments = [];
      }

      project.comments.push({
        _id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        user: currentUser, // In memory mode, we store populated user details directly
        content: content.trim(),
        createdAt: new Date()
      });

      const updatedProject = await memoryDB.findByIdAndUpdate('projects', req.params.id, {
        comments: project.comments
      });

      // Notify the project author (if the commenter is not the author)
      const authorId = project.author?._id || project.author?.id || project.author;
      const commenterId = req.user._id || req.user.id;
      const commenterName = req.user.name || 'A user';
      if (authorId && authorId.toString() !== commenterId.toString()) {
        await sendNotification(
          authorId,
          'New Comment',
          `"${commenterName}" commented on your project "${project.title}".`
        );
      }

      return res.json(updatedProject);
    }
  } catch (err) {
    console.error('Error adding comment:', err);
    return res.status(500).json({ message: 'Server error adding comment' });
  }
};

// @desc    Give support to a project (by another student or teacher)
// @route   POST /api/projects/:id/support
// @access  Private
const supportProject = async (req, res) => {
  const { message } = req.body;
  const supporterName = req.user.name || 'A user';
  const supporterRole = req.user.role;
  const userId = req.user._id || req.user.id;

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const authorId = project.author?._id || project.author?.id || project.author;
    const db = require('../models/db');
    const memoryDB = require('../models/memoryDB');

    const supportMsg = message || 'I would like to support your project!';
    const newSupportItem = {
      user: userId,
      message: supportMsg,
      createdAt: new Date()
    };

    let updatedProject;
    if (db.isConnected()) {
      const ProjectModel = require('../models/Project').model;
      updatedProject = await ProjectModel.findByIdAndUpdate(
        req.params.id,
        { $push: { supports: newSupportItem } },
        { new: true }
      ).populate('author').populate('endorsedBy').populate('assignedMembers').populate('comments.user').populate('supports.user').populate('sponsorships.user');
    } else {
      const User = require('../models/User');
      const userObj = await User.findById(userId);
      const memorySupportItem = {
        _id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        user: userObj || { name: supporterName, role: supporterRole },
        message: supportMsg,
        createdAt: new Date()
      };
      
      const rawProjects = memoryDB.getRawCollection('projects');
      const idx = rawProjects.findIndex(p => p._id === req.params.id || p.id === req.params.id);
      if (idx !== -1) {
        if (!rawProjects[idx].supports) rawProjects[idx].supports = [];
        rawProjects[idx].supports.push(memorySupportItem);
        updatedProject = JSON.parse(JSON.stringify(rawProjects[idx]));
      } else {
        updatedProject = project;
      }
    }

    // Award +15 GIP to supporter, +10 GIP to project author
    await awardPoints(userId, project._id || project.id, 15, `Offered support to project: ${project.title}`);
    await awardPoints(authorId, project._id || project.id, 10, `Received support offer from ${supporterName}`);

    // Send notifications
    await sendNotification(
      userId,
      'Points Earned! 🏆',
      `You earned +15 GIP for offering support to "${project.title}".`
    );
    await sendNotification(
      authorId,
      'Support Offered 🤝',
      `"${supporterName}" (${supporterRole}) offered support for your project "${project.title}": "${supportMsg}". Earned +10 GIP.`
    );

    return res.json(updatedProject);
  } catch (err) {
    console.error('Error offering project support:', err);
    return res.status(500).json({ message: 'Server error offering support' });
  }
};

// @desc    Sponsor a project (by an investor or partner)
// @route   POST /api/projects/:id/sponsor
// @access  Private
const sponsorProject = async (req, res) => {
  const { message, amount } = req.body;
  const sponsorName = req.user.name || 'A sponsor';
  const sponsorRole = req.user.role;
  const userId = req.user._id || req.user.id;

  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const authorId = project.author?._id || project.author?.id || project.author;
    const db = require('../models/db');
    const memoryDB = require('../models/memoryDB');

    const sponsorMsg = message || 'I would like to sponsor your project!';
    const sponsorAmount = Number(amount) || 0;
    const newSponsorItem = {
      user: userId,
      message: sponsorMsg,
      amount: sponsorAmount,
      createdAt: new Date()
    };

    let updatedProject;
    if (db.isConnected()) {
      const ProjectModel = require('../models/Project').model;
      updatedProject = await ProjectModel.findByIdAndUpdate(
        req.params.id,
        { $push: { sponsorships: newSponsorItem } },
        { new: true }
      ).populate('author').populate('endorsedBy').populate('assignedMembers').populate('comments.user').populate('supports.user').populate('sponsorships.user');
    } else {
      const User = require('../models/User');
      const userObj = await User.findById(userId);
      const memorySponsorItem = {
        _id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        user: userObj || { name: sponsorName, role: sponsorRole },
        message: sponsorMsg,
        amount: sponsorAmount,
        createdAt: new Date()
      };
      
      const rawProjects = memoryDB.getRawCollection('projects');
      const idx = rawProjects.findIndex(p => p._id === req.params.id || p.id === req.params.id);
      if (idx !== -1) {
        if (!rawProjects[idx].sponsorships) rawProjects[idx].sponsorships = [];
        rawProjects[idx].sponsorships.push(memorySponsorItem);
        updatedProject = JSON.parse(JSON.stringify(rawProjects[idx]));
      } else {
        updatedProject = project;
      }
    }

    // Award +30 GIP to sponsor, +50 GIP to project author
    await awardPoints(userId, project._id || project.id, 30, `Sponsored project: ${project.title}`);
    await awardPoints(authorId, project._id || project.id, 50, `Received sponsorship from ${sponsorName}`);

    // Send notifications
    await sendNotification(
      userId,
      'Points Earned! 🏆',
      `You earned +30 GIP for sponsoring the project "${project.title}".`
    );
    await sendNotification(
      authorId,
      'Project Sponsored! 💵',
      `"${sponsorName}" (${sponsorRole}) sponsored your project "${project.title}"${sponsorAmount > 0 ? ` with RWF ${sponsorAmount}` : ''}: "${sponsorMsg}". Earned +50 GIP.`
    );

    return res.json(updatedProject);
  } catch (err) {
    console.error('Error sponsoring project:', err);
    return res.status(500).json({ message: 'Server error sponsoring project' });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  endorseProject,
  recommendProject,
  markProjectReady,
  featureProject,
  updateProject,
  deleteProject,
  addComment,
  supportProject,
  sponsorProject
};
