const mongoose = require('mongoose');
const db = require('./db');
const memoryDB = require('./memoryDB');

const AuditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  details: { type: String }
}, { timestamps: true });

const AuditLogModel = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);

const AuditLog = {
  find: async (query) => {
    if (db.isConnected()) return AuditLogModel.find(query).populate('user');
    return memoryDB.find('auditLogs', query);
  },
  create: async (data) => {
    if (db.isConnected()) return AuditLogModel.create(data);
    return memoryDB.create('auditLogs', data);
  },
  schema: AuditLogSchema,
  model: AuditLogModel
};

module.exports = AuditLog;
