/* global require: false, describe: false, before: false, after: false, it: false */

'use strict';
require('co-mocha');
const chai = require('chai');
chai.use(require('chai-string'));
chai.use(require('chai-as-promised'));
const assert = chai.assert;
const webdriver = require('selenium-webdriver');
const driver = new webdriver.Builder().forBrowser('chrome').build();
const page = require('./page_api')(driver);

describe('Import Trivial Model', function() {

	this.timeout(7500);

	before(done => {
		driver.navigate().to('http://192.168.1.101:9988/lic_w/lic_w.html');
		page.get(page.file_uploader_button)
			.sendKeys('C:\\Users\\remi\\Downloads\\20015 - Alligator.mpd')
			.then(() => done());
	});

	after(done => {
		driver.quit().then(() => done());
	});

	it('Status bar should report successful import', () => {
		return assert.eventually.startsWith(page.getText(page.status_bar), '"20015 - Alligator.mpd" loaded successfully');
	});

	it('Highlight should still be invisible', () => {
		return assert.eventually.equal(page.getCss(page.highlight, 'display'), 'none');
	});

	it('Menus should reflect imported model', function *() {
		const c = page.getClass, m = page.sub_menu;
		assert.equal(yield c(m.file.close), '');
		assert.equal(yield c(m.file.save), '');
		assert.equal(yield c(m.edit.undo), 'disabled');
		assert.equal(yield c(m.edit.redo), 'disabled');
		assert.equal(yield c(m.edit.snap_to), '');
		assert.equal(yield c(m.view.add_horizontal_guide), '');
		assert.equal(yield c(m.export.generate_pdf), '');
		assert.equal(yield c(m.export.generate_png_images), '');
	});

	it('Page should not be blank', () => {
		return assert.eventually.isFalse(page.isPageCanvasBlank());
	});

	it('Click center of Page should highlight CSI', function *() {
		page.click(page.page_canvas);
		assert.equal(yield page.getCss(page.highlight, 'display'), 'block');
		assert.equal(yield page.getCss(page.highlight, 'left'), '205px');
		assert.equal(yield page.getCss(page.highlight, 'top'), '194px');
		assert.equal(yield page.getCss(page.highlight, 'width'), '390px');
		assert.equal(yield page.getCss(page.highlight, 'height'), '211px');
	});

	it('Click just outside CSI should highlight Step', function *() {
		page.click(page.page_canvas, {x: 150, y: 150});
		assert.equal(yield page.getCss(page.highlight, 'display'), 'block');
		assert.equal(yield page.getCss(page.highlight, 'left'), '17px');
		assert.equal(yield page.getCss(page.highlight, 'top'), '17px');
		assert.equal(yield page.getCss(page.highlight, 'width'), '766px');
		assert.equal(yield page.getCss(page.highlight, 'height'), '566px');
	});

	it('Click near edge of Page should highlight Page', function *() {
		page.click(page.page_canvas, {x: 5, y: 5});
		assert.equal(yield page.getCss(page.highlight, 'display'), 'block');
		assert.equal(yield page.getCss(page.highlight, 'left'), '-3px');
		assert.equal(yield page.getCss(page.highlight, 'top'), '-3px');
		assert.equal(yield page.getCss(page.highlight, 'width'), '806px');
		assert.equal(yield page.getCss(page.highlight, 'height'), '606px');
	});

	it('Click off page should remove highlight', () => {
		page.click(page.page_canvas, {x: -5, y: -5});
		return assert.eventually.equal(page.getCss(page.highlight, 'display'), 'none');
	});
});
