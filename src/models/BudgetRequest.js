const mongoose = require('mongoose');
const db = require('./db');
const memoryDB = require('./memoryDB');

const BudgetRequestSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, default: 'Pending' }
}, { timestamps: true });

const BudgetRequestModel = mongoose.models.BudgetRequest || mongoose.model('BudgetRequest', BudgetRequestSchema);

const BudgetRequest = {
  find: async (query) => {
    if (db.isConnected()) return BudgetRequestModel.find(query).populate('project').populate('requestedBy');
    return memoryDB.find('budgetRequests', query);
  },
  findOne: async (query) => {
    if (db.isConnected()) return BudgetRequestModel.findOne(query).populate('project').populate('requestedBy');
    return memoryDB.findOne('budgetRequests', query);
  },
  findById: async (id) => {
    if (db.isConnected()) return BudgetRequestModel.findById(id).populate('project').populate('requestedBy');
    return memoryDB.findById('budgetRequests', id);
  },
  create: async (data) => {
    if (db.isConnected()) {
      const created = await BudgetRequestModel.create(data);
      return BudgetRequestModel.findById(created._id).populate('project').populate('requestedBy');
    }
    const User = require('./User');
    const Project = require('./Project');
    const requestedBy = await User.findById(data.requestedBy);
    const project = data.project ? await Project.findById(data.project) : null;
    const enrichedData = { ...data, requestedBy, project };
    return memoryDB.create('budgetRequests', enrichedData);
  },
  findByIdAndUpdate: async (id, data, options) => {
    if (db.isConnected()) {
      return BudgetRequestModel.findByIdAndUpdate(id, data, { new: true, ...options })
        .populate('project')
        .populate('requestedBy');
    }
    return memoryDB.findByIdAndUpdate('budgetRequests', id, data);
  },
  schema: BudgetRequestSchema,
  model: BudgetRequestModel
};

module.exports = BudgetRequest;
