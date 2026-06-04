const mongoose = require('mongoose');
const db = require('./db');
const memoryDB = require('./memoryDB');

const GreenImpactTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  points: { type: Number, required: true },
  reason: { type: String, required: true }
}, { timestamps: true });

const GreenImpactTransactionModel = mongoose.models.GreenImpactTransaction || mongoose.model('GreenImpactTransaction', GreenImpactTransactionSchema);

const GreenImpactTransaction = {
  find: async (query) => {
    if (db.isConnected()) return GreenImpactTransactionModel.find(query).populate('user').populate('project');
    return memoryDB.find('transactions', query);
  },
  findOne: async (query) => {
    if (db.isConnected()) return GreenImpactTransactionModel.findOne(query).populate('user').populate('project');
    return memoryDB.findOne('transactions', query);
  },
  findById: async (id) => {
    if (db.isConnected()) return GreenImpactTransactionModel.findById(id).populate('user').populate('project');
    return memoryDB.findById('transactions', id);
  },
  create: async (data) => {
    if (db.isConnected()) {
      const created = await GreenImpactTransactionModel.create(data);
      return GreenImpactTransactionModel.findById(created._id).populate('user').populate('project');
    }
    const User = require('./User');
    const Project = require('./Project');
    const user = await User.findById(data.user);
    const project = data.project ? await Project.findById(data.project) : null;
    const enrichedData = { ...data, user, project };
    return memoryDB.create('transactions', enrichedData);
  },
  findByIdAndUpdate: async (id, data, options) => {
    if (db.isConnected()) {
      return GreenImpactTransactionModel.findByIdAndUpdate(id, data, { new: true, ...options })
        .populate('user')
        .populate('project');
    }
    return memoryDB.findByIdAndUpdate('transactions', id, data);
  },
  schema: GreenImpactTransactionSchema,
  model: GreenImpactTransactionModel
};

module.exports = GreenImpactTransaction;
