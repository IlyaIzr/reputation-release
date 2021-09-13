var fs = require("fs");

exports.install = function () {
	ROUTE('GET /*', mainPage);

	ROUTE("GET /.well-known/acme-challenge/", cert);
};

function mainPage() {
	this.view('layout')
}


function cert() {
	// this === framework
  // PATH.mkdir(PATH.public(this.url), '');
	this.stream("text/plain", fs.createReadStream(PATH.public(this.url)));
}