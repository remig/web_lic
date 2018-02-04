/* global exports: false, browser: false */

exports.config = {
	specs: [
		'./specs/test_LDParse.js',
		'./specs/test_LDRender.js',
		'./specs/test_util.js',
		'./specs/test_store.js',
		'./specs/test_undoStack.js',
		'./specs/test_initial_page.js',
		'./specs/test_import_model.js',
		'./specs/test_tree.js'
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
			if (typeof selector === 'object' && selector.hasOwnProperty('ELEMENT')) {
				return this.elementIdAttribute(selector.ELEMENT, 'class').value;
			}
			return this.getAttribute(selector, 'class');
		});
		browser.addCommand('getCss', function(selector, property) {
			if (typeof selector === 'object' && selector.hasOwnProperty('ELEMENT')) {
				return this.elementIdCssProperty(selector.ELEMENT, property).value;
			}
			return this.getCssProperty(selector, property).value;
		});
	}
};
