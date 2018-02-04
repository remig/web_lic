/* global require: false, describe: false, before: false, it: false, browser: false, app: false */

'use strict';
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;
const page = require('../page_api')(browser);
const trivial_model = require('../trivial_model.json').model;

describe('Import Trivial Model', function() {

	before(() => {
		browser.url('http://192.168.1.101:9977/web_lic/web_lic.html');
		browser.execute(function(model, fn) {
			app.importLocalModel(model, fn);
		}, trivial_model, 'trivial_model.ldr');
		browser.waitForText('#statusBar', 9000);
	});

	it('Verify initial tree content', () => {
		assert.equal(browser.elements(page.selectors.tree.topLevelRows).value.length, 4);
		const treeTextNodes = browser.elements(page.selectors.tree.textContainers).value;
		assert.equal(treeTextNodes.length, 26);
		assert.equal(browser.elementIdText(treeTextNodes[0].ELEMENT).value, 'Title Page');
		assert.isEmpty(browser.elementIdText(treeTextNodes[1].ELEMENT).value, '');  // Invisible nodes have no text in webdriver's world
		assert.equal(browser.elementIdText(treeTextNodes[5].ELEMENT).value, 'Page 1');
		assert.equal(browser.elementIdText(treeTextNodes[12].ELEMENT).value, 'Page 2');
		assert.equal(browser.elementIdText(treeTextNodes[19].ELEMENT).value, 'Page 3');

		const treeIcons = browser.elements(page.selectors.tree.arrowIcons).value;
		assert.equal(treeIcons.length, 11);
		treeIcons.forEach(el => {
			assert.equal(browser.getClass(el), page.classes.tree.parentRow.closed);
		});

		const treeChildren = browser.elements(page.selectors.tree.childRows).value;
		assert.equal(treeChildren.length, 11);
		treeChildren.forEach(el => {
			assert.equal(browser.getClass(el), page.classes.tree.childRow.hidden);
		});
	});

	it('Click closed parent row should expand it', () => {
	});
});
