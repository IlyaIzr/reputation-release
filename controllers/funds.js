exports.install = function () {

  ROUTE('POST /api/funds/create', createFund);
  ROUTE('GET /api/funds/getMembers', getMembers);
  ROUTE('GET /api/funds/getFunds', getFunds);
  ROUTE('GET /api/funds/formatted', getFormatted);
  ROUTE('PUT /api/funds/updateOwner', updateOwner);
  ROUTE('PUT /api/funds/updateForm', updateForm);
  ROUTE('PUT /api/funds/addUser', addUser);
  ROUTE('PUT /api/funds/updateUser', updateUser);
  ROUTE('DELETE /api/funds/deleteUser', deleteUser);
};

async function createFund() {

  const $ = this
  const data = $.body

  // Simple validation
  if (!data.name) {
    return $.json({ status: 'ERR', msg: 'Введите все обязательные поля' })
  }
  if (!data.id) {
    data.id = UID()
    data.create = new Date();
  }


  // Insert fund
  const builder = await NOSQL('funds')
    // .insert({ ...data }, true)
    .insert(data)
    .where('name', data.name)
    .promise()


  if (!builder)
    return $.json({ status: 'ERR', msg: 'Фонд с этим именем уже существует' })

  // Add fund ownership to owner  
  const user = await NOSQL('userprops').one().where('id', data.owner).promise()
  // user kinda guranteed at this point, BUT... jik
  if (!user) return $.json({ status: 'REAUTH', msg: 'Непредвиденная ошибка' })
  if (!user.funds) user.funds = {}
  user.funds[data.id] = 'owner'

  await NOSQL('userprops').modify(user).where('id', data.owner).promise()


  $.json({ status: 'OK', msg: `Фонд ${data.name} создан`, data: { user, fund: data } })
}

// api/funds/getMembers
async function getMembers() {
  const $ = this
  const { id } = $.query

  const usersWithProps = await NOSQL('userprops').find().rule('doc.funds[arg.id]', { id }).promise()
  if (usersWithProps?.length) await Promise.all(usersWithProps.map(async (user, i) => {

    const info = await TABLE('users').one()
      .where('id', user.id).fields('-password')
      .promise()

    usersWithProps[i] = { ...user, ...info }
  }))

  $.json({ status: 'OK', data: usersWithProps })
}

async function getFunds() {
  const $ = this
  const user = $.user
  if (!user) return $.json({ status: 'ERR', msg: 'ошибка авторизации при запросе списка фондов' })
  // if (!user) $.json({ status: 'REAUTH', msg: 'ошибка авторизации при запросе списка фондов' })
  const role = user.role

  if (role === 'root') {
    const res = await NOSQL('funds').find().promise()
    return $.json({ status: 'OK', data: res })
  }


  var groups = []
  const userInfo = await DEF.getUserProps(user.id)
  const userGroups = Object.entries(userInfo?.funds)
  // Return manageble groups only
  userGroups.length && await Promise.all(userGroups.map(async ([id, role]) => {
    if (role === 'manager' || role === 'owner') {
      const groupInfo = await NOSQL('funds').one().id(id).promise()
      if (groupInfo) groups.push(groupInfo)
    }
  }))

  return $.json({ status: 'OK', data: groups })
}

async function getFormatted() {
  const $ = this

  const fund = await NOSQL('funds').one().id($.query.id).promise()
  if (!fund) return $.json({ status: 'ERR', msg: 'Неверный id фонда' })
  const formatted = { ...fund }

  // Find all members data
  const owner = await TABLE('users').one().id(fund.owner).fields('id,username').promise()
  formatted.owner = {}
  if (owner) formatted.owner = { value: owner.id, label: owner.username }
  // __for arrays
  formatted.managers = []
  fund.managers?.length && await Promise.all(fund.managers.map(async (id) => {
    const user = await TABLE('users').one().id(id).fields('-role,-password').promise()
    user && formatted.managers.push({ ...user, value: id, label: user.username })
  }))
  formatted.users = []
  fund.users?.length && await Promise.all(fund.users.map(async (id) => {
    const user = await TABLE('users').one().id(id).fields('-role,-password').promise()
    user && formatted.users.push({ ...user, value: id, label: user.username })
  }))
  formatted.readonlys = []
  fund.readonlys?.length && await Promise.all(fund.readonlys.map(async (id) => {
    const user = await TABLE('users').one().id(id).fields('-role,-password').promise()
    user && formatted.readonlys.push({ ...user, value: id, label: user.username })
  }))

  $.json({ status: 'OK', data: formatted })
}

async function updateOwner() {
  const $ = this
  const { fundId, ownerId, prevOwnerId } = $.body

  const fundChange = await NOSQL('funds').modify({ owner: ownerId }).id(fundId).promise()
  if (!fundChange) return $.json({ status: 'ERR', msg: 'Неверный id группы' })

  // Add fund ownership to owner  
  const user = await NOSQL('userprops').one().id(ownerId).promise()
  if (!user) return $.json({ status: 'REAUTH', msg: 'Непредвиденная ошибка' })
  if (!user.funds) user.funds = {}
  user.funds[fundId] = 'owner'
  await NOSQL('userprops').modify(user).id(ownerId).promise()

  if (prevOwnerId) {
    const prevOwner = await NOSQL('userprops').one().id(prevOwnerId).promise()
    if (!prevOwner) return $.json({ status: 'REAUTH', msg: 'Непредвиденная ошибка' })
    delete prevOwner.funds[fundId]
    await NOSQL('userprops').modify(prevOwner).id(prevOwnerId).promise()
  }

  const fund = await NOSQL('funds').one().id(fundId).promise()
  return $.json({ data: fund, status: 'OK', msg: 'Фонд ' + fund.name + ' обновлен. Добавлен владелец' })
}

async function updateForm() {
  const $ = this
  const { fundId, data } = $.body

  if (await NOSQL('funds').one().where('name', data.name).notin('id', fundId).promise()) return $.json({ status: 'ERR', msg: 'Имя уже занято' })
  await NOSQL('funds').modify(data).id(fundId).promise()
  const res = await NOSQL('funds').one().id(fundId).promise()
  if (!res) return $.json({ status: 'ERR', msg: 'Неверный id группы или неверные введенные данные' })
  $.json({ data: res, status: 'OK', msg: 'Фонд ' + res.name + ' обновлен' })
}

async function addUser() {
  const $ = this
  const { userId, role, fundId } = $.body

  // Validation
  const fund = await NOSQL('funds').one().id(fundId).promise()
  if (!fund) return $.json({ status: 'ERR', msg: 'Неверный id группы' })
  const user = await NOSQL('userprops').one().id(userId).promise()
  if (!user) return $.json({ status: 'ERR', msg: 'Неверный id пользователя' })

  // Update fund
  if (!fund[role + 's']) fund[role + 's'] = []
  fund[role + 's'].push(userId)
  await NOSQL('funds').modify(fund).id(fundId).promise()

  // Update user
  if (!user.funds) user.funds = {}
  user.funds[fundId] = role
  await NOSQL('userprops').modify(user).id(userId).promise()

  $.json({ status: 'OK', data: fund, msg: 'Пользователь добавлен' })
}

async function updateUser() {
  const $ = this
  const { userId, role, prevRole, fundId } = $.body

  // Validation
  const fund = await NOSQL('funds').one().id(fundId).promise()
  if (!fund) return $.json({ status: 'ERR', msg: 'Неверный id группы' })
  const user = await NOSQL('userprops').one().id(userId).promise()
  if (!user) return $.json({ status: 'ERR', msg: 'Неверный id пользователя' })

  // Update fund
  if (!fund[role + 's']) fund[role + 's'] = []
  fund[role + 's'].push(userId)
  fund[prevRole + 's'] = fund[prevRole + 's'].filter(id => id !== userId)
  await NOSQL('funds').modify(fund).id(fundId).promise()

  // Update user
  user.funds[fundId] = role
  await NOSQL('userprops').modify(user).id(userId).promise()

  $.json({ status: 'OK', data: fund, msg: 'Пользователь обновлен' })
}

async function deleteUser() {
  const $ = this
  const { userId, prevRole, fundId } = $.body

  // Validation
  const fund = await NOSQL('funds').one().id(fundId).promise()
  if (!fund) return $.json({ status: 'ERR', msg: 'Неверный id группы' })
  const user = await NOSQL('userprops').one().id(userId).promise()
  if (!user) return $.json({ status: 'ERR', msg: 'Неверный id пользователя' })

  // Update fund
  fund[prevRole + 's'] = fund[prevRole + 's'].filter(id => id !== userId)
  await NOSQL('funds').modify(fund).id(fundId).promise()

  // Update user
  delete user.funds[fundId]
  await NOSQL('userprops').modify(user).id(userId).promise()

  $.json({ status: 'OK', data: fund, msg: 'Пользователь удален из фонда' })
}