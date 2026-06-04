const mongoose = require('mongoose');
const db = require('./db');
const memoryDB = require('./memoryDB');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });

const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

const Notification = {
  find: async (query) => {
    if (db.isConnected()) return NotificationModel.find(query).populate('user');
    return memoryDB.find('notifications', query);
  },
  findOne: async (query) => {
    if (db.isConnected()) return NotificationModel.findOne(query).populate('user');
    return memoryDB.findOne('notifications', query);
  },
  findByIdAndUpdate: async (id, data, options) => {
    if (db.isConnected()) return NotificationModel.findByIdAndUpdate(id, data, { new: true, ...options });
    return memoryDB.findByIdAndUpdate('notifications', id, data);
  },
  create: async (data) => {
    if (db.isConnected()) return NotificationModel.create(data);
    return memoryDB.create('notifications', data);
  },
  schema: NotificationSchema,
  model: NotificationModel
};

module.exports = Notification;
