exports.install = function () {
	ROUTE('GET /*', mainPage);
};

function mainPage() {
	this.view('layout')
}