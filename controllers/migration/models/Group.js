const mongoose = require('mongoose');

const Schema = mongoose.Schema

const groupRoles = ['owner', 'manager', 'user', 'readonly']

const GroupSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true //?
  },
  email: {
    type: String,
    required: false,
    // unique: true //?
  },
  skype: {
    type: String,
    required: false,
    // unique: true //?
  },
  site: {
    type: String,
    required: false,
  },
  discord: {
    type: String,
    required: false,
  },
  owner: {
    type: String,
    required: false,
  },
  managers: {
    type: Array,
    required: false
  },
  users: {
    type: Array,
    required: false
  },
  readonlys: {
    type: Array,
    required: false
  },
})

module.exports = Group = mongoose.model('Group', GroupSchema)