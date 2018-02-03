/* global exports: false, browser: false */

exports.config = {
	specs: [
		'./test_LDParse.js',
		'./test_LDRender.js',
		'./test_util.js',
		'./test_store.js',
		'./test_undoStack.js',
		'./test_initial_page.js',
		'./test_import_model.js'
		'./test_tree.js',
	],
	exclude: [],
	maxInstances: 1,
	capabilities: [{
		maxInstances: 1,
		browserName: 'chrome'
	}],
	port: '9515',
	path: '/',
	sync: true,
	logLevel: 'error',
	coloredLogs: true,
	deprecationWarnings: false,
	bail: 0,
	screenshotPath: './errorShots/',
	baseUrl: 'http://localhost',
	waitforTimeout: 1000000,
	connectionRetryTimeout: 90000,
	connectionRetryCount: 3,
	services: ['chromedriver'],
	framework: 'mocha',
	reporters: ['spec'],
	mochaOpts: {
		ui: 'bdd',
		timeout: 1000000
	},
	before: function() {
		browser.addCommand('getClass', function(selector) {
			return this.getAttribute(selector, 'class');
		});
		browser.addCommand('getCss', function(selector, property) {
			return this.getCssProperty(selector, property).value;
		});
	}
};
