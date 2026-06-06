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
    };

    const updatedProject = await Project.findByIdAndUpdate(req.params.id, updates);

    return res.json(updatedProject);
  } catch (err) {
    console.error('Error updating project:', err);
    return res.status(500).json({ message: 'Server error updating project' });
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
  updateProject
};
