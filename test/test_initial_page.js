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

describe('Launch empty Page', function() {

	this.timeout(7500);

	before(done => {
		driver.navigate().to('http://192.168.1.101:9977/web_lic/web_lic.html')
			.then(() => done());
	});

	after(done => {
		driver.quit()
			.then(() => done());
	});

	it('Page title should be \'Web Lic!\'', () => {
		return assert.eventually.equal(driver.getTitle(), 'Web Lic!');
	});

	it('non-existent ID should not crash', done => {
		driver.findElement({id: 'foo_bar'})
			.then(() => done("ID 'foo_bar' should not exist"))
			.catch(error => done());
	});

	it('Page Canvas should be blank', () => {
		return assert.eventually.isTrue(page.isPageCanvasBlank());
	});

	it('highlight should be invisible', () => {
		return assert.eventually.equal(page.getCss(page.highlight, 'display'), 'none');
	});

	it('click initial empty page should not highlight', () => {
		page.click(page.page_canvas);
		return assert.eventually.equal(page.getCss(page.highlight, 'display'), 'none');
	});

	describe('Test top level menu', () => {

		it('click \'File\' should open top level menu', () => {
			page.click(page.menu.file);
			return assert.eventually.equal(page.getClass(page.menu.file), 'dropdown open');
		});

		it('\'File -> Open\' and \'File -> Import\' should be enabled, everything else disabled', function *() {
			assert.equal(yield page.getClass(page.sub_menu.file.open), '');
			assert.equal(yield page.getClass(page.sub_menu.file.open_recent), 'disabled');
			assert.equal(yield page.getClass(page.sub_menu.file.close), 'disabled');
			assert.equal(yield page.getClass(page.sub_menu.file.save), 'disabled');
			assert.equal(yield page.getClass(page.sub_menu.file.save_as), 'disabled');
			assert.notEqual(yield page.getClass(page.sub_menu.file.import_model), 'disabled');
			assert.equal(yield page.getClass(page.sub_menu.file.save_template), 'disabled');
		});

		it('\'Edit\', \'View\' and \'Export\' menus should all be disabled', function *() {
			const menu = page.sub_menu;
			const menus = [
				menu.edit.undo, menu.edit.redo, menu.edit.snap_to, menu.edit.brick_colors,
				menu.view.add_horizontal_guide,
				menu.export.generate_pdf, menu.export.generate_png_images
			];
			for (let i = 0; i < menus.length; i++) {
				assert.equal(yield page.getClass(menus[i]), 'disabled');
			}
		});

		it('click outside menu should close menu', () => {
			return page.get(page.sub_menu.file.open).getSize()
				.then(size => driver.actions()
					.mouseMove(page.get(page.sub_menu.file.open), {x: size.width + 10, y: size.height})
					.click().perform()
				)
				.then(() => driver.findElement({id: 'file_menu'}).getAttribute('class'))
				.then(attr => assert.strictEqual(attr, 'dropdown'));
		});
	});

	/*
	it('Model\'s base CSI should exist and contain an image', function(done) {
		driver.findElement({id: 'CSI_0'})
			.then(el => el.getAttribute('href'))
			.then(attr => assert.startsWith(attr, 'data:image/png;base64'))
			.then(() => done())
	});

	it('click CSI should highlight', function(done) {
		driver.actions().mouseMove(driver.findElement({id: 'pageCanvas'}), {x: 400, y: 300})
			.click().perform()
			.then(() => {
				driver.findElement({id: 'highlight'})
					.then(el => el.getCssValue('display'))
					.then(attr => assert.strictEqual(attr, 'block'))
					.then(() => done());
			});
	});
	*/
});
