const mongoose = require('mongoose');
const db = require('./db');
const memoryDB = require('./memoryDB');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  avatar: { type: String },
  gipPoints: { type: Number, default: 0 },
  profileCompleteness: { type: Number, default: 80 }
}, { timestamps: true });

const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

const User = {
  find: async (query) => {
    if (db.isConnected()) return UserModel.find(query);
    return memoryDB.find('users', query);
  },
  findOne: async (query) => {
    if (db.isConnected()) return UserModel.findOne(query);
    return memoryDB.findOne('users', query);
  },
  findById: async (id) => {
    if (db.isConnected()) return UserModel.findById(id);
    return memoryDB.findById('users', id);
  },
  create: async (data) => {
    if (db.isConnected()) return UserModel.create(data);
    return memoryDB.create('users', data);
  },
  findByIdAndUpdate: async (id, data, options) => {
    if (db.isConnected()) return UserModel.findByIdAndUpdate(id, data, { new: true, ...options });
    return memoryDB.findByIdAndUpdate('users', id, data);
  },
  schema: UserSchema,
  model: UserModel
};

module.exports = User;
