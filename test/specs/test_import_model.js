/* global browser: false, require: false, before: false, describe: false, it: false, app: false */

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

	it('Status bar should report successful import', () => {
		assert.startsWith(browser.getText(page.ids.status_bar), '"trivial_model.ldr" loaded successfully');
	});

	it('Highlight should be invisible', () => {
		assert.isFalse(page.highlight.isVisible());
	});

	it('Menus should reflect imported model', () => {
		const m = page.ids.sub_menu, v = page.classes.menu;
		assert.equal(browser.getClass(m.file.close), v.enabled);
		assert.equal(browser.getClass(m.file.save), v.enabled);
		assert.equal(browser.getClass(m.edit.undo), v.disabled);
		assert.equal(browser.getClass(m.edit.redo), v.disabled);
		assert.equal(browser.getClass(m.edit.snap_to), v.disabled);
		assert.equal(browser.getClass(m.view.add_horizontal_guide), v.disabled);
		assert.equal(browser.getClass(m.export.generate_pdf), v.enabled);
		assert.equal(browser.getClass(m.export.generate_png_images), v.enabled);
	});

	it('Canvas should not be blank', () => {
		assert.isFalse(page.isPageCanvasBlank());
	});

	function validateHighlight(x, y, width, height) {
		assert.isTrue(page.highlight.isVisible());
		const highlightBox = page.highlight.bbox();
		assert.isAtLeast(highlightBox.x, x);
		assert.isAtLeast(highlightBox.y, y);
		assert.equal(highlightBox.width, width);
		assert.equal(highlightBox.height, height);
	}

	describe('Test highlight', () => {

		it('Click center of Page should highlight CSI', () => {
			const canvasSize = browser.getElementSize(page.ids.page_canvas);
			browser.leftClick(page.ids.page_canvas, canvasSize.width / 2, canvasSize.height / 2);
			validateHighlight(385, 305, 122, 80);
		});

		it('Click just outside CSI should highlight Step', () => {
			browser.leftClick(page.ids.page_canvas, 385, 305);
			validateHighlight(365, 285, 162, 120);
		});

		it('Click near edge of Page should highlight Page', () => {
			browser.leftClick(page.ids.page_canvas, 5, 5);
			validateHighlight(-5, -5, 906, 706);
		});

		it('Click off page should remove highlight', () => {
			browser.leftClick(page.ids.page_canvas, -10, -10);
			assert.isFalse(page.highlight.isVisible());
		});
	});
});
