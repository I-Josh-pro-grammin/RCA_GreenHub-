const mongoose = require('mongoose');
const db = require('./db');
const memoryDB = require('./memoryDB');

const AnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  visibility: { type: String, default: 'Internal' }
}, { timestamps: true });

const AnnouncementModel = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);

const Announcement = {
  find: async (query) => {
    if (db.isConnected()) return AnnouncementModel.find(query).populate('author');
    return memoryDB.find('announcements', query);
  },
  findOne: async (query) => {
    if (db.isConnected()) return AnnouncementModel.findOne(query).populate('author');
    return memoryDB.findOne('announcements', query);
  },
  findById: async (id) => {
    if (db.isConnected()) return AnnouncementModel.findById(id).populate('author');
    return memoryDB.findById('announcements', id);
  },
  create: async (data) => {
    if (db.isConnected()) {
      const created = await AnnouncementModel.create(data);
      return AnnouncementModel.findById(created._id).populate('author');
    }
    const User = require('./User');
    const author = await User.findById(data.author);
    const enrichedData = { ...data, author };
    return memoryDB.create('announcements', enrichedData);
  },
  findByIdAndUpdate: async (id, data, options) => {
    if (db.isConnected()) {
      return AnnouncementModel.findByIdAndUpdate(id, data, { new: true, ...options }).populate('author');
    }
    return memoryDB.findByIdAndUpdate('announcements', id, data);
  },
  schema: AnnouncementSchema,
  model: AnnouncementModel
};

module.exports = Announcement;
