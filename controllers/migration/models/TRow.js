const mongoose = require('mongoose');

const Schema = mongoose.Schema

const TRowSchema = new Schema({
  author: {
    // Group id
    type: String,
    required: false,
  },

  // Rest info
  FIO: {
    type: Array,
    required: false,
    // [{ lastname: 'Ivanov', firstname: 'Anton', middlename: 'Popkovitch' }]
  },
  skype: {
    type: [String],
    required: false,
  },
  nickname: {
    type: Array,
    required: false,
    // TODO [{ discipline: '', room: '', value: '' }]
  },
  nicknameOld: String,
  gipsyteam: {
    type: [String],
  },
  pokerstrategy: {
    type: [String],
  },
  case: {
    // [{ arbitrage: '', amount: '500$', descr: 'stole' }]  
    // TODO ?
    type: Array,
  },
  google: {
    type: [String],
  },
  mail: {
    type: [String],
  },
  phone: {
    type: [String],
  },
  vk: {
    type: [String],
  },
  facebook: {
    type: [String],
  },
  blog: {
    type: [String],
  },
  instagram: {
    type: [String],
  },
  forum: {
    type: [String],
  },
  location: {
    // [{ country: 'russia', town: 'smolensk', address: 'zelyonaya ulitsa 88' }]
    type: Array,
  },
  neteller: {
    type: [String],
  },
  skrill: {
    type: [String],
  },
  ecopayz: {
    type: [String],
  },
  webmoney: {
    // [{ WMID: '123', wallets: ['asfasf', 'asfas'] }]
    type: Array,
  },
  comments: {
    type: String
  },
  fundName: {
    type: String,
  },
  old: {
    type: Boolean,
    default: false
  }
},

  {
    timestamps: { createdAt: 'created', updatedAt: 'updated' }
  }
)

module.exports = TRow = mongoose.model('TRow', TRowSchema)