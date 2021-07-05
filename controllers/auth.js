const bcrypt = require('bcryptjs');

exports.install = function () {

	ROUTE('POST /api/auth/login', login);
	ROUTE('GET /api/auth/refresh', refresh);
	ROUTE('POST /api/auth/regTest', regTest);
	ROUTE('GET /api/auth/logout', logout);
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


	var opt = {...DEF.cookieOptions};
	opt.id = comparedUser.id;              // A user ID
	opt.data = comparedUser;               // A session data
	opt.note = ($.headers['user-agent'] || '').parseUA() + ' ({0})'.format($.ip); // A custom note

	// Creates a cookie and session item
	// return MAIN.session.setcookie($, opt, $.done(user));
	return MAIN.session.setcookie($, opt, _ => $.json({ status: 'OK', msg: 'Успешный логин', data: comparedUser }));
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