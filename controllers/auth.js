const bcrypt = require('bcryptjs');

exports.install = function () {

	ROUTE('POST /api/auth/login', login);
	ROUTE('GET /api/auth/refresh', refresh);
	ROUTE('POST /api/auth/regTest', regTest);
	ROUTE('GET /api/auth/logout', logout);
	ROUTE('PUT /api/auth/updateCreds', updateCreds);
};

async function login() {
	const $ = this
	const { credential, password } = $.body

	// Simple validation
	if (!credential || !password) {
		return $.status(400).json({ status: 'ERR', msg: 'Введите все обязательные поля' })
	}

	const builder = TABLE('users').find();
	builder.or(function () {
		builder.where('login', credential);
		builder.where('email', credential);
		builder.where('discord', credential);
	});
	const res = await builder.promise()

	if (!res?.[0]) return $.status(400).json({ status: 'ERR', msg: 'Неверный пароль или логин' })

	let comparedUser = null

	await Promise.all(res.map(async user => {
		if (password === user.password || await bcrypt.compare(password, user.password))
			return comparedUser = user
	}))

	if (!comparedUser) return $.json({ status: 'ERR', msg: 'Неверный пароль или логин' })

	delete comparedUser.password
	// Add user props
	const userProps = await NOSQL('userprops').one().id(comparedUser.id).promise() || {}

	var opt = { ...DEF.cookieOptions };
	opt.id = comparedUser.id;              // A user ID
	opt.data = comparedUser;               // A session data
	opt.note = ($.headers['user-agent'] || '').parseUA() + ' ({0})'.format($.ip); // A custom note

	// Creates a cookie and session item
	// return MAIN.session.setcookie($, opt, $.done(user));
	return MAIN.session.setcookie($, opt, _ => $.json({
		status: 'OK', msg: 'Успешный логин', data: { user: comparedUser, userProps }
	}));
}

async function refresh() {
	const $ = this

	const userInfo = DEF.getUserInfo($)
	delete userInfo.password

	const userProps = await NOSQL('userprops').one().where('id', userInfo.id).promise()
	const fundNames = await NOSQL('funds').find().fields('id,name').promise()

	const toPass = { user: userInfo, userProps, fundNames }
	$.json({ status: 'OK', msg: 'Cookie refresed', data: toPass })
}

async function regTest() {
	const $ = this
	const { login, password } = $.body

	const id = UID()
	// Insert to table
	const builder = await TABLE('users')
		.insert({ login, password, discord: login, username: login, id, role: 'root' })
		.promise()
	// Inser to nosql user props гоы
	await NOSQL('userprops').insert({ id }).promise()


	$.json({ status: 'OK', msg: 'all good', data: builder })
}


// https://docs.totaljs.com/total4/62546001dd51c/

async function logout() {
	const $ = this
	MAIN.session.remove($.sessionid);
	$.cookie(CONF.cookie, '', '-1 year');
	$.json({ status: 'OK' })
}

async function updateCreds() {
	const $ = this

	let { email, login, discord, password, username } = $.body
	if (!email && !login && !discord) return $.json({ status: 'ERR', msg: 'Введите все обязательные поля' })

	if (!username) username = login || discord || email

	// Check if credentials vacant
	if (login && await TABLE('users').one().notin('id', $.user.id).where('login', login).promise())
		return $.json({ status: 'ERR', msg: 'Указанный логин занят' })
	if (email && await TABLE('users').one().notin('id', $.user.id).where('email', email).promise())
		return $.json({ status: 'ERR', msg: 'Указанный email занят' })
	if (discord && await TABLE('users').one().notin('id', $.user.id).where('discord', discord).promise())
		return $.json({ status: 'ERR', msg: 'Указанный discord занят' })

	// If password, hash it
	if (password) $.body.password = await bcrypt.hash(password, 10)
	// Update users table	
	const updateUser = await TABLE('users')
		.modify({ ...$.body }, true)
		.where('id', $.user.id)
		.promise()
	if (!updateUser) return $.json({ status: 'ERR', msg: 'не удалось обновить пользователя' })

	// Delete prev session
	MAIN.session.remove($.sessionid);
	$.cookie(CONF.cookie, '', '-1 year');
	// Update authorization
	const userData = { email, login, discord, username, id: $.user.id }
	// if (email) userData.email = email
	// if (login) userData.login = login
	// if (discord) userData.discord = discord
	const opt = { ...DEF.cookieOptions };
	opt.id = $.user.id;              // A user ID
	opt.data = { ...$.user, ...userData };               // A session data
	opt.note = ($.headers['user-agent'] || '').parseUA() + ' ({0})'.format($.ip); // A custom note

	// Creates a cookie and session item
	// return MAIN.session.setcookie($, opt, $.done(user));
	return MAIN.session.setcookie($, opt, _ => $.json({ status: 'OK', msg: 'Данные обновлены', data: userData }));
}