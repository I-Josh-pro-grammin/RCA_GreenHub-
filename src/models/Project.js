const mongoose = require('mongoose');
const db = require('./db');
const memoryDB = require('./memoryDB');

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  department: { type: String, required: true },
  stage: { type: String },
  targetArea: { type: String },
  githubLink: { type: String },
  liveDemo: { type: String },
  supportNeeded: [{ type: String }],
  points: { type: Number, default: 0 },
  status: { type: String, default: 'Pending' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isEndorsed: { type: Boolean, default: false },
  endorsedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isRecommendedForSupport: { type: Boolean, default: false },
  isRecommendedForInvestors: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  assignedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  supports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  sponsorships: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    amount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const ProjectModel = mongoose.models.Project || mongoose.model('Project', ProjectSchema);

const Project = {
  find: async (query) => {
    if (db.isConnected()) return ProjectModel.find(query).populate('author').populate('endorsedBy').populate('assignedMembers').populate('comments.user').populate('supports.user').populate('sponsorships.user');
    return memoryDB.find('projects', query);
  },
  findOne: async (query) => {
    if (db.isConnected()) return ProjectModel.findOne(query).populate('author').populate('endorsedBy').populate('assignedMembers').populate('comments.user').populate('supports.user').populate('sponsorships.user');
    return memoryDB.findOne('projects', query);
  },
  findById: async (id) => {
    if (db.isConnected()) return ProjectModel.findById(id).populate('author').populate('endorsedBy').populate('assignedMembers').populate('comments.user').populate('supports.user').populate('sponsorships.user');
    return memoryDB.findById('projects', id);
  },
  create: async (data) => {
    if (db.isConnected()) {
      const created = await ProjectModel.create(data);
      return ProjectModel.findById(created._id).populate('author').populate('comments.user').populate('supports.user').populate('sponsorships.user');
    }
    // Pre-populate author from memoryDB in fallback mode
    const User = require('./User');
    const authorUser = await User.findById(data.author);
    const enrichedData = { ...data, author: authorUser, comments: [], supports: [], sponsorships: [] };
    return memoryDB.create('projects', enrichedData);
  },
  findByIdAndUpdate: async (id, data, options) => {
    if (db.isConnected()) {
      return ProjectModel.findByIdAndUpdate(id, data, { new: true, ...options })
        .populate('author')
        .populate('endorsedBy')
        .populate('assignedMembers')
        .populate('comments.user')
        .populate('supports.user')
        .populate('sponsorships.user');
    }
    return memoryDB.findByIdAndUpdate('projects', id, data);
  },
  schema: ProjectSchema,
  model: ProjectModel
};

module.exports = Project;
