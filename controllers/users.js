const bcrypt = require('bcryptjs');

exports.install = function () {

  ROUTE('POST /api/users/create', create);
  ROUTE('GET /api/users/all', getAll);
  ROUTE('GET /api/users/children', getChildren);
  ROUTE('GET /api/users/fullInfo', getFullInfo);
  ROUTE('GET /api/users/some', getSome);
  ROUTE('PUT /api/users/updateAnoterUser', updateAnoterUser);
};

async function create() {
  const $ = this

  const { email, login, discord, password, role } = $.body
  const name = $.body.name || login || discord || email

  // Simple validation
  const oneOf = email || login || discord
  if (!password || !oneOf) {
    return $.json({ status: 'ERR', msg: 'Введите все обязательные поля' })
  }

  // Check existing user
  if (login) var user = await TABLE('users').one().where('login', login).promise()
  if (email && !user) var user = await TABLE('users').one().where('email', email).promise()
  if (discord && !user) var user = await TABLE('users').one().where('discord', discord).promise()
  if (user) return $.json({ status: 'ERR', msg: 'Пользователь уже существует' })

  // Create user
  // __Hash password
  const hashedPassword = await bcrypt.hash(password, 10)
  const id = UID()

  // write children to creator 
  const creator = await NOSQL('userprops').one().where('id', $.user.id).promise()
  if (!creator) return $.json({ status: 'REAUTH', msg: 'Неверный запрос, #creatoriderr1' })
  if (!creator.children) creator.children = []
  creator.children.push(id)
  await NOSQL('userprops').modify({ ...creator }).where('id', creator.id).promise()

  // register new user
  await TABLE('users')
    .insert({ login, password: hashedPassword, discord, username: name, id, role })
    .promise()
  // Inser to nosql user props гоы
  await NOSQL('userprops').insert({ id }).promise()
  $.json({ status: 'OK', msg: 'Пользователь зарегистрирован', data: { login, discord, username: name, id, role } })
}

// /api/users/all
async function getAll() {
  const $ = this


  const builder = TABLE('users').find()	//.one() - error
    .fields('-password')
  builder.join('userProps', 'nosql/userprops').on('id', 'id').first()
  const res = await builder.promise()

  $.json({ status: 'OK', data: res })
}

// /api/users/children
async function getChildren() {
  const $ = this

  const props = await DEF.getUserProps($.user.id)
  const children = props.children || []
  const users = []

  await Promise.all(children.length && children.map(async (id) => {
    const user = await TABLE('users').one().where('id', id).fields('-password').promise()
    const userProps = await NOSQL('userprops').one().id(id).promise()
    const res = { ...user, userProps }
    if (res) users.push(res)
  }));

  $.json({ status: 'OK', data: users })
}

async function getFullInfo() {
  const $ = this
  const { id } = $.query

  const user = await TABLE('users').one().id(id).fields('-password').promise()
  const props = await NOSQL('userprops').one().id(id).promise()

  $.json({ status: 'OK', data: { ...user, userProps: props } })
}

async function updateAnoterUser() {
  const $ = this
  const { login, password, discord, username, email, id } = $.body
  if (!$.body.role) $.body.role = 'guest'

  // Check existing user
  if (login && await TABLE('users').one().where('login', login).notin('id', id).promise())
    return $.json({ status: 'ERR', msg: 'Этот логин занят - ' + login })
  if (email && await TABLE('users').one().where('email', email).notin('id', id).promise())
    return $.json({ msg: 'Этот e-mail занят - ' + email })
  if (discord && await TABLE('users').one().where('discord', discord).notin('id', id).promise())
    return $.json({ status: 'ERR', msg: 'Этот дискорд занят - ' + discord })

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10)
    var tableUsers = await TABLE('users')
      .modify({ ...$.body, password: hashedPassword }, true)
      .where('id', id)
      .promise()
  } else {
    var tableUsers = await TABLE('users')
      .modify({ ...$.body }, true)
      .where('id', id)
      .promise()
  }
  if (!tableUsers) return $.json({ status: 'ERR', msg: 'не удалось обновить пользователя' })
  $.json({ status: 'OK', msg: 'Информация успешно обновлена' })

}

// /api/users/some
async function getSome() {
  const $ = this
  const { creds } = $.query

  const users = await TABLE('users').find()
    .or(function (b) {
      b.where('login', creds)
      b.where('username', creds)
      b.where('email', creds)
      b.where('discord', creds)
    })
    .promise()


  return $.json({ data: users || [], status: 'OK' })
}