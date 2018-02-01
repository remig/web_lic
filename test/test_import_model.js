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
		driver.navigate().to('http://192.168.1.101:9977/web_lic/web_lic.html');
		page.get(page.file_uploader_button)
			.sendKeys('C:\\LDraw\\Models\\Creator\\20015 - Alligator.mpd')
			.then(done);
	});

	after(done => {
		driver.quit().then(done);
	});

	it('Status bar should report successful import', () => {
		return assert.eventually.startsWith(page.getText(page.status_bar), '"20015 - Alligator.mpd" loaded successfully');
	});

	it('Highlight should be invisible', () => {
		return assert.eventually.equal(page.getCss(page.highlight, 'display'), 'none');
	});

	it('Menus should reflect imported model', function *() {
		const c = page.getClass, m = page.sub_menu;
		assert.equal(yield c(m.file.close), '');
		assert.equal(yield c(m.file.save), '');
		assert.equal(yield c(m.edit.undo), 'disabled');
		assert.equal(yield c(m.edit.redo), 'disabled');
		assert.equal(yield c(m.edit.snap_to), 'disabled');
		assert.equal(yield c(m.view.add_horizontal_guide), 'disabled');
		assert.equal(yield c(m.export.generate_pdf), '');
		assert.equal(yield c(m.export.generate_png_images), '');
	});

	it('Canvas should not be blank', () => {
		return assert.eventually.isFalse(page.isPageCanvasBlank());
	});

	describe('Test highlight', () => {

		it('Click center of Page should highlight CSI', function *() {
			page.click(page.page_canvas);
			assert.equal(yield page.getCss(page.highlight, 'display'), 'block');
			assert.isAtLeast(parseInt(yield page.getCss(page.highlight, 'left'), 10), 250);
			assert.isAtLeast(parseInt(yield page.getCss(page.highlight, 'top'), 10), 240);
			assert.equal(yield page.getCss(page.highlight, 'width'), '390px');
			assert.equal(yield page.getCss(page.highlight, 'height'), '211px');
		});

		it('Click just outside CSI should highlight Step', function *() {
			page.click(page.page_canvas, {x: 240, y: 300});
			assert.equal(yield page.getCss(page.highlight, 'display'), 'block');
			assert.isAtLeast(parseInt(yield page.getCss(page.highlight, 'left'), 10), 230);
			assert.isAtLeast(parseInt(yield page.getCss(page.highlight, 'top'), 10), 220);
			assert.equal(yield page.getCss(page.highlight, 'width'), '430px');
			assert.equal(yield page.getCss(page.highlight, 'height'), '251px');
		});

		it('Click near edge of Page should highlight Page', function *() {
			page.click(page.page_canvas, {x: 5, y: 5});
			assert.equal(yield page.getCss(page.highlight, 'display'), 'block');
			assert.isAtLeast(parseInt(yield page.getCss(page.highlight, 'left'), 10), -3);
			assert.isAtLeast(parseInt(yield page.getCss(page.highlight, 'top'), 10), -3);
			assert.equal(yield page.getCss(page.highlight, 'width'), '906px');
			assert.equal(yield page.getCss(page.highlight, 'height'), '706px');
		});

		it('Click off page should remove highlight', () => {
			page.click(page.page_canvas, {x: -5, y: -5});
			return assert.eventually.equal(page.getCss(page.highlight, 'display'), 'none');
		});
	});

	describe('Clicking Tree should highlight related item', () => {

		it('Click first arrow should expand Title Page node', function *() {
//			assert.equal(yield page.get(page.tree).findElement({css: 'ul > li > ul'}).getAttribute('class'), 'indent hidden');
		});
	});
});
