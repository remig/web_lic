/* global browser: false */

'use strict';
const fs = require('fs');
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;
const page = require('../page_api')(browser);
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

	let canvasSize;
	before(() => {
		if (!fs.existsSync(downloadPath)) {
			fs.mkdirSync(downloadPath);
		}
		clearDownloads();
		page.importTrivialModel();
		canvasSize = browser.getElementSize(page.ids.pageCanvas);
	});

	after(clearDownloads);

	it('Status bar should report successful import', () => {
		assert.startsWith(browser.getText(page.ids.statusBar), '"trivial_model.ldr" loaded successfully');
	});

	it('Filename should be visible in nav bar', () => {
		assert.isTrue(browser.isExisting(page.ids.filenameContainer));
		assert.equal(browser.getText2(page.ids.filenameContainer), 'trivial_model.ldr');
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
		const m = page.ids.subMenu, v = page.classes.menu;
		assert.equal(browser.getClass2(m.file.close), v.enabled);
		assert.equal(browser.getClass2(m.file.save), v.enabled);
		assert.equal(browser.getClass2(m.edit.undo), v.disabled);
		assert.equal(browser.getClass2(m.edit.redo), v.disabled);
		assert.equal(browser.getClass2(m.edit.snapTo), v.disabled);
		assert.equal(browser.getClass2(m.view.addHorizontalGuide), v.disabled);
		assert.equal(browser.getClass2(m.export.generatePdf), v.enabled);
		assert.equal(browser.getClass2(m.export.generatePngImages), v.enabled);
	});

	it('Canvas should not be blank', () => {
		assert.isFalse(page.isPageCanvasBlank());
	});

	describe('Test highlight & selection', () => {

		it('Click center of Page should highlight CSI', () => {
			browser.leftClick(page.ids.pageCanvas, canvasSize.width / 2, canvasSize.height / 2);
			assert.isTrue(page.highlight.isValid(385, 305, 122, 80));
			assert.deepEqual(page.getSelectedItem(), {id: 3, type: 'csi'});
		});

		it('Click just outside CSI should highlight Step', () => {
			browser.leftClick(page.ids.pageCanvas, 385, 305);
			assert.isTrue(page.highlight.isValid(365, 285, 162, 120));
			assert.deepEqual(page.getSelectedItem(), {id: 3, type: 'step'});
		});

		it('Click near edge of Page should highlight Page', () => {
			browser.leftClick(page.ids.pageCanvas, 5, 5);
			assert.isTrue(page.highlight.isValid(-5, -5, 906, 706));
			assert.deepEqual(page.getSelectedItem(), {id: 0, type: 'titlePage'});
		});

		it('Click off page should remove highlight', () => {
			browser.leftClick(page.ids.pageCanvas, -10, -10);
			assert.isFalse(page.highlight.isVisible());
			assert.isNull(page.getSelectedItem());
		});
	});

	describe('Test page navigation', () => {

		it('First drawn page should be title page', () => {
			assert.deepEqual(page.getCurrentPage(), {pageID: 0, type: 'titlePage'});
		});

		it('Page up key on title page should do nothing', () => {
			browser.keys(['PageUp']);
			assert.deepEqual(page.getCurrentPage(), {pageID: 0, type: 'titlePage'});
		});

		it('Page down key should scroll to next page', () => {
			browser.keys(['PageDown']);
			assert.deepEqual(page.getCurrentPage(), {pageID: 0, type: 'page'});
			browser.keys(['PageUp']);
			assert.deepEqual(page.getCurrentPage(), {pageID: 0, type: 'titlePage'});
			browser.keys(['PageDown', 'PageDown', 'PageDown', 'PageDown', 'PageDown']);
			assert.deepEqual(page.getCurrentPage(), {pageID: 2, type: 'page'});
			browser.keys(['PageUp', 'PageUp', 'PageUp', 'PageUp', 'PageUp', 'PageUp']);
			assert.deepEqual(page.getCurrentPage(), {pageID: 0, type: 'titlePage'});
		});

		it('Page up / down should clear selection', () => {
			browser.leftClick(page.ids.pageCanvas, canvasSize.width / 2, canvasSize.height / 2);
			assert.isTrue(page.highlight.isValid(385, 305, 122, 80));
			assert.deepEqual(page.getSelectedItem(), {id: 3, type: 'csi'});
			browser.keys(['PageDown']);
			assert.isFalse(page.highlight.isVisible());
			assert.isNull(page.getSelectedItem());
			browser.keys(['PageUp']);
			assert.deepEqual(page.getCurrentPage(), {pageID: 0, type: 'titlePage'});
		});
	});

	describe('Test context menu', () => {

		const context = page.ids.contextMenuContainer;

		it('Context menu should exit invisibly', () => {
			assert.isTrue(browser.isExisting(context));
			assert.isFalse(browser.isVisible(context));
		});

		it('Right click should open context menu', () => {
			browser.leftClick(page.ids.pageCanvas, canvasSize.width / 2, canvasSize.height / 2);
			browser.rightClick();
			assert.isTrue(browser.isVisible(context));
			const box = browser.getBBox2(page.selectors.contextMenu.content);
			assert.deepEqual(box, {x: 750, y: 613, width: 165, height: 109});
			const text = browser.getText2(page.selectors.contextMenu.entries);
			assert.deepEqual(text, ['Rotate Step Image', 'Scale CSI (NYI)', '', 'Add New Part (NYI)']);
		});

		it('Left click anywhere should hide context menu', () => {
			browser.leftClick(page.ids.pageCanvas, 5, 5);
			assert.isFalse(browser.isVisible(context));
		});

		it('Left click outside page should hide context menu', () => {
			browser.leftClick(page.ids.pageCanvas, canvasSize.width / 2, canvasSize.height / 2);
			browser.rightClick();
			assert.isTrue(browser.isVisible(context));
			browser.leftClick(page.ids.menuContainer);
			assert.isFalse(browser.isVisible(context));
		});

		it('Click nested menu should open child', () => {
			browser.leftClick(page.ids.pageCanvas, canvasSize.width / 2, 140);
			browser.rightClick();
			assert.isFalse(browser.isVisible(page.selectors.contextMenu.parentRow(0).subMenu));
			assert.isTrue(browser.isVisible(context));
			const box = browser.getBBox2(page.selectors.contextMenu.content);
			assert.deepEqual(box, {x: 750, y: 403, width: 160, height: 64});
			const text = browser.getText2(page.selectors.contextMenu.entries);
			assert.deepEqual(text, ['Set', 'Delete']);
			browser.leftClick(page.selectors.contextMenu.parentRow(0).selector);
			assert.isTrue(browser.isVisible(page.selectors.contextMenu.parentRow(0).subMenu));
		});

		it('Multiple clicks in nested menu with multiple entries should close previous menus', () => {
			browser.keys(['PageDown']);
			assert.deepEqual(page.getCurrentPage(), {pageID: 0, type: 'page'});
			browser.leftClick(page.ids.pageCanvas, canvasSize.width / 2, 140);
			browser.rightClick();
			const text = browser.getText2(page.selectors.contextMenu.entries);
			assert.deepEqual(text, ['Add Callout', 'Move Step to', 'Merge Step with...', '', 'Prepend Blank Step', 'Append Blank Step']);  // Move context menu content to page API

			// TODO: fix context menu lookups to use IDs, so we don't have to rely on order here
			browser.leftClick(page.selectors.contextMenu.parentRow(1).selector);
			assert.isTrue(browser.isVisible(page.selectors.contextMenu.parentRow(1).subMenu));
			assert.isFalse(browser.isVisible(page.selectors.contextMenu.parentRow(2).subMenu));

			browser.leftClick(page.selectors.contextMenu.parentRow(2).selector);
			assert.isFalse(browser.isVisible(page.selectors.contextMenu.parentRow(1).subMenu));
			assert.isTrue(browser.isVisible(page.selectors.contextMenu.parentRow(2).subMenu));

			browser.keys(['PageUp']);
			assert.deepEqual(page.getCurrentPage(), {pageID: 0, type: 'titlePage'});
		});
	});

	it('Modify model should set dirty state and save state to localStorage', () => {
		assert.isTrue(browser.isExisting(page.ids.filenameContainer));
		assert.equal(browser.getText2(page.ids.filenameContainer), 'trivial_model.ldr');
		browser.leftClick(page.ids.pageCanvas, canvasSize.width / 2, canvasSize.height / 2);
		browser.keys(['ArrowRight']);
		assert.equal(browser.getText2(page.ids.filenameContainer), 'trivial_model.ldr *');
		let localStorage = browser.localStorage('GET', 'lic_state').value;
		assert.isNotNull(localStorage);
		localStorage = JSON.parse(localStorage);
		assert.containsAllKeys(localStorage, ['colorTable', 'model', 'partDictionary', 'state']);
	});

	it('Save file should download a file and reset dirty flag', () => {
		assert.equal(browser.getText2(page.ids.filenameContainer), 'trivial_model.ldr *');
		browser.click(page.ids.menu.file);
		browser.click(page.ids.subMenu.file.save);
		assert.equal(browser.getText2(page.ids.filenameContainer), 'trivial_model.ldr');
		browser.pause(500);
		assert.isTrue(fs.existsSync(downloadPath));
		assert.isTrue(fs.existsSync(saveFile));
		const content = JSON.parse(fs.readFileSync(saveFile, {encoding: 'utf8', flag: 'r'}).replace(/^\uFEFF/, ''));
		assert.containsAllKeys(content, ['colorTable', 'model', 'partDictionary', 'state']);
	});
});
