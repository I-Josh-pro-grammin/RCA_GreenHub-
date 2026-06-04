const mongoose = require('mongoose');
const db = require('./db');
const memoryDB = require('./memoryDB');

const SupportRequestSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const SupportRequestModel = mongoose.models.SupportRequest || mongoose.model('SupportRequest', SupportRequestSchema);

const SupportRequest = {
  find: async (query) => {
    if (db.isConnected()) return SupportRequestModel.find(query).populate('project').populate('requester').populate('assignedTo');
    return memoryDB.find('supportRequests', query);
  },
  findOne: async (query) => {
    if (db.isConnected()) return SupportRequestModel.findOne(query).populate('project').populate('requester').populate('assignedTo');
    return memoryDB.findOne('supportRequests', query);
  },
  findById: async (id) => {
    if (db.isConnected()) return SupportRequestModel.findById(id).populate('project').populate('requester').populate('assignedTo');
    return memoryDB.findById('supportRequests', id);
  },
  create: async (data) => {
    if (db.isConnected()) {
      const created = await SupportRequestModel.create(data);
      return SupportRequestModel.findById(created._id).populate('project').populate('requester');
    }
    const User = require('./User');
    const Project = require('./Project');
    const requester = await User.findById(data.requester);
    const project = await Project.findById(data.project);
    const enrichedData = { ...data, requester, project, assignedTo: [] };
    return memoryDB.create('supportRequests', enrichedData);
  },
  findByIdAndUpdate: async (id, data, options) => {
    if (db.isConnected()) {
      return SupportRequestModel.findByIdAndUpdate(id, data, { new: true, ...options })
        .populate('project')
        .populate('requester')
        .populate('assignedTo');
    }
    return memoryDB.findByIdAndUpdate('supportRequests', id, data);
  },
  schema: SupportRequestSchema,
  model: SupportRequestModel
};

module.exports = SupportRequest;
