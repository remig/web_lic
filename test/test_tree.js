/* global require: false, describe: false, before: false, it: false, browser: false, app: false */

'use strict';
const chai = require('chai');
chai.use(require('chai-string'));
chai.use(require('chai-as-promised'));
const assert = chai.assert;
const trivial_model = require('./trivial_model.json').model;

describe('Import Trivial Model', function() {

	before(() => {
		browser.url('http://192.168.1.101:9977/web_lic/web_lic.html');
		browser.execute(function(model, fn) {
			app.importLocalModel(model, fn);
		}, trivial_model, 'trivial_model.ldr');
		browser.waitForText('#statusBar', 9000);
	});

	it('Verify initial tree content', () => {
		const treeIcons = browser.elements('#tree .treeIcon').value;
		assert.equal(treeIcons.length, 11);
	});
});
