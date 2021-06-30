const mongoose = require('mongoose');

const Schema = mongoose.Schema

const userRoles = ['root', 'admin', 'guest'] // don't mind admin

const UserSchema = new Schema({
  login: {
    type: String,
    required: false,
    // unique: true
  },
  name: {
    type: String,
    required: false,
    // unique: false,
  },
  discord: {
    type: String,
    required: false,
    // unique: true
  },
  email: {
    type: String,
    required: false,
    // unique: true
  },
  role: {
    type: String,
    enum: userRoles,
    required: true,
    default: 'guest'
  },
  password: {
    type: String,
    required: true,
  },
  groups: {
    type: Object,
    default: {},
  },
  children: {
    type: [String],
    required: false,
  }
})

module.exports = User = mongoose.model('User', UserSchema)