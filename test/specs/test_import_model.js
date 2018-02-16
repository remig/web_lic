/* global browser: false, require: false, before: false, after: false, describe: false, it: false, app: false */

'use strict';
const fs = require('fs');
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;
const page = require('../page_api')(browser);
const trivial_model = require('../trivial_model.json').model;
const downloadPath = browser.options.downloadPath;
const saveFile = `${downloadPath}/trivial_model.lic`;

const clearDownloads = () => {
	if (fs.existsSync(downloadPath)) {
		fs.readdirSync(downloadPath).forEach(fn => {
			fs.unlinkSync(`${downloadPath}/${fn}`);
		});
	}
};

describe('Import Trivial Model', function() {

	before(() => {
		if (!fs.existsSync(downloadPath)) {
			fs.mkdirSync(downloadPath);
		}
		clearDownloads();
		browser.url('http://192.168.1.101:9977/web_lic/web_lic.html');
		browser.execute(function(model, fn) {
			app.importLocalModel(model, fn);
		}, trivial_model, 'trivial_model.ldr');
		browser.waitForText('#statusBar', 9000);
	});

	after(clearDownloads);

	it('Status bar should report successful import', () => {
		assert.startsWith(browser.getText(page.ids.status_bar), '"trivial_model.ldr" loaded successfully');
	});

	it('Filename should be visible in nav bar', () => {
		assert.isTrue(browser.isExisting(page.ids.filename_container));
		assert.equal(browser.getText2(page.ids.filename_container), 'trivial_model.ldr');
	});

	it('LocalStorage should reflect imported model', () => {
		let localStorage = browser.localStorage('GET', 'lic_state').value;
		assert.isNotNull(localStorage);
		localStorage = JSON.parse(localStorage);
		assert.containsAllKeys(localStorage, ['colorTable', 'model', 'partDictionary', 'state']);
	});

	it('Highlight should be invisible', () => {
		assert.isFalse(page.highlight.isVisible());
	});

	it('Menus should reflect imported model', () => {
		const m = page.ids.sub_menu, v = page.classes.menu;
		assert.equal(browser.getClass2(m.file.close), v.enabled);
		assert.equal(browser.getClass2(m.file.save), v.enabled);
		assert.equal(browser.getClass2(m.edit.undo), v.disabled);
		assert.equal(browser.getClass2(m.edit.redo), v.disabled);
		assert.equal(browser.getClass2(m.edit.snap_to), v.disabled);
		assert.equal(browser.getClass2(m.view.add_horizontal_guide), v.disabled);
		assert.equal(browser.getClass2(m.export.generate_pdf), v.enabled);
		assert.equal(browser.getClass2(m.export.generate_png_images), v.enabled);
	});

	it('Canvas should not be blank', () => {
		assert.isFalse(page.isPageCanvasBlank());
	});

	describe('Test highlight', () => {

		it('Click center of Page should highlight CSI', () => {
			const canvasSize = browser.getElementSize(page.ids.page_canvas);
			browser.leftClick(page.ids.page_canvas, canvasSize.width / 2, canvasSize.height / 2);
			assert.isTrue(page.highlight.isValid(385, 305, 122, 80));
		});

		it('Click just outside CSI should highlight Step', () => {
			browser.leftClick(page.ids.page_canvas, 385, 305);
			assert.isTrue(page.highlight.isValid(365, 285, 162, 120));
		});

		it('Click near edge of Page should highlight Page', () => {
			browser.leftClick(page.ids.page_canvas, 5, 5);
			assert.isTrue(page.highlight.isValid(-5, -5, 906, 706));
		});

		it('Click off page should remove highlight', () => {
			browser.leftClick(page.ids.page_canvas, -10, -10);
			assert.isFalse(page.highlight.isVisible());
		});
	});

	it('Modify model should set dirty state and save state to localStorage', () => {
		assert.isTrue(browser.isExisting(page.ids.filename_container));
		assert.equal(browser.getText2(page.ids.filename_container), 'trivial_model.ldr');
		const canvasSize = browser.getElementSize(page.ids.page_canvas);
		browser.leftClick(page.ids.page_canvas, canvasSize.width / 2, canvasSize.height / 2);
		browser.keys(['ArrowRight']);
		assert.equal(browser.getText2(page.ids.filename_container), 'trivial_model.ldr *');
		let localStorage = browser.localStorage('GET', 'lic_state').value;
		assert.isNotNull(localStorage);
		localStorage = JSON.parse(localStorage);
		assert.containsAllKeys(localStorage, ['colorTable', 'model', 'partDictionary', 'state']);
	});

	it('Save file should download a file and reset dirty flag', () => {
		assert.equal(browser.getText2(page.ids.filename_container), 'trivial_model.ldr *');
		browser.click(page.ids.menu.file);
		browser.click(page.ids.sub_menu.file.save);
		assert.equal(browser.getText2(page.ids.filename_container), 'trivial_model.ldr');
		browser.pause(500);
		assert.isTrue(fs.existsSync(downloadPath));
		assert.isTrue(fs.existsSync(saveFile));
		const content = JSON.parse(fs.readFileSync(saveFile, {encoding: 'utf8', flag: 'r'}).replace(/^\uFEFF/, ''));
		assert.containsAllKeys(content, ['colorTable', 'model', 'partDictionary', 'state']);
	});
});
