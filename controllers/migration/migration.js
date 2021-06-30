const mongoose = require('mongoose');
const User = require('./models/User')
const Group = require('./models/Group')
const TRow = require('./models/TRow')

const mongoUrl = CONF.mongoUrl
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
}

exports.install = function () {
  ROUTE('GET /migration/test', test);
  ROUTE('GET /migration/copyUsers', copyUsers);
  ROUTE('GET /migration/copyFunds', copyFunds);
  ROUTE('GET /migration/copyTable', copyTable);
};

async function test() {
  const $ = this
  // Connect
  mongoose
    .connect(mongoUrl, options)
    .then(() => console.log('connected to mongoDb'))
    // Do action
    .then(async () => await action())
    // Close connection
    .then(_ => mongoose.connection.close())
    .catch((e) => $.json(e))

  // Action
  async function action() {
    const users = await User.find({})
    console.log('%c⧭ length', 'color: #7f7700', users.length);

    const user = await NOSQL('userprops').find().promise()
    console.log('%c⧭', 'color: #00ff88', user);

    // Respond to request
    $.plain('Done!')
  }
}

async function copyUsers() {
  const $ = this
  // Connect
  mongoose
    .connect(mongoUrl, options)
    .then(() => console.log('connected to mongoDb'))
    .then(async () => await action())
    .then(_ => mongoose.connection.close())
    .catch((e) => $.json(e))

  // Action
  async function action() {
    const users = await User.find({})

    if (!users.length) throw 'no users found'
    const userExceptions = []

    await Promise.all(users.map(async userObj => {
      const { role, children, _id, login, discord, password, name, groups } = userObj
      const tableUsers = await TABLE('users')
        .insert({ login, password, discord, username: name, id: _id, role }, true)
        .where('id', _id)
        .promise()
      if (!tableUsers) userExceptions.push(userObj)

      await NOSQL('userprops').modify({ id: _id, funds: groups, children }, true).where('id', _id).promise()
    }))

    // Respond to request
    if (userExceptions.length) return $.json({ msg: 'done but exceptions werent pushed', exceptions: userExceptions })
    $.plain('Done!')
  }

}


async function copyFunds() {
  const $ = this
  // Connect
  mongoose
    .connect(mongoUrl, options)
    .then(() => console.log('connected to mongoDb'))
    .then(async () => await action())
    .then(_ => mongoose.connection.close())
    .catch((e) => $.json(e))

  // Action
  async function action() {

    const funds = await Group.find({})
    console.log('%c⧭', 'color: #8c0038', funds);

    if (!funds.length) throw 'no funds found'
    const fundsExceptions = []

    await Promise.all(funds.map(async fundsObj => {
      const { name, email, skype, site, discord, owner, managers, users, readonlys, _id } = fundsObj

      const builder = await NOSQL('funds')
        .insert({ id: _id, name, email, skype, site, discord, owner, managers, users, readonlys }, true)
        .where('id', _id).
        promise()
      if (!builder) fundsExceptions.push(fundsObj)
    }))

    // Respond to request
    if (fundsExceptions.length) return $.json({ msg: 'done but exceptions werent pushed', exceptions: fundsExceptions })
    $.plain('Done!')
  }

}


async function copyTable() {
  const $ = this
  // Connect
  mongoose
    .connect(mongoUrl, options)
    .then(() => console.log('connected to mongoDb'))
    .then(async () => await action())
    .then(_ => mongoose.connection.close())
    .catch((e) => $.json(e))

  // Action
  async function action() {

    const tableRows = await TRow.find({})
    const s = TRow.findOne({})

    if (!tableRows.length) throw 'no table rows found'
    const rowsExceptions = []

    await Promise.all(tableRows.map(async tRow => {
      // Remove mongo service keys
      const toInsert = tRow._doc
      toInsert.id = tRow._id
      delete toInsert._id
      delete toInsert.__v

      const builder = await NOSQL('arbitrages')
        .insert({ ...toInsert }, true)
        .where('id', toInsert.id).
        promise()
      if (!builder) rowsExceptions.push(tRow)
    }))

    // Respond to request
    if (rowsExceptions.length) return $.json({ msg: 'done but exceptions werent pushed', exceptions: rowsExceptions })
    $.plain('Done!')
  }

}