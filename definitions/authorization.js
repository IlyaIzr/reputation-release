// ================================================
// AUTHORIZATION
// Please note that this method is called for all routes, regardless of flags set.
// For example, if the route is flagged with 'authorize', and the callback return value is false, the response status will be 401.
// Alternatively, beware that if the route is flagged with 'unauthorize', and the callback return value is false, the response status will be 200 OK.
// ================================================

// MAIN is a global shared object (it's part of Total.js)
// We create a session instance
// Why do we use MAIN.session? Because we can access into the session from every place (on server-side) in this application
MAIN.session = SESSION();

// Delegate for loading session data
MAIN.session.ondata = function(meta, next) {
	// Loads user data from DB
	TABLE('users').one().where('id', meta.id).callback(next);
};

AUTH(function($) {


	// This function will be executed for each request with except requests to static files

	// Session options:
	var opt = DEF.cookieOptions;

	// opt.removecookie = true;    // Removes cookie if isn't valid (default: true)
	// opt.extendcookie = true;    // Extends cookie expiration (default: true)
	// opt.options = {};           // Optional, a cookie options when the the cookie is extended (default: { httponly: true, security: 'lax' })
	// opt.ddos = 5;               // Enables a simple DDOS protection for hijacking


	// Reads a cookie and session
	MAIN.session.getcookie($, opt, cb);
  function cb(err, data, sessionMeta) {
    // console.log('%c⧭ auth data: ', 'color: #00bf00', data);
    if (!data) return $.invalid()
    $.success(data)
  }
});
