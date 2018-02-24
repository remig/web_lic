/* global require: false, browser: false, before: false, describe: false, it: false */

'use strict';
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;
const page = require('../page_api')(browser);

describe('Launch empty Page', function() {

	before(() => {
		browser.url('http://192.168.1.101:9977/web_lic/web_lic.html');
	});

	it("Page title should be 'Web Lic!'", () => {
		assert.equal(browser.getTitle(), 'Web Lic!');
	});

	describe('Test top level menu', () => {

		it('All top level menu entries exist and are closed', () => {
			for (var k in page.ids.menu) {
				if (page.ids.menu.hasOwnProperty(k)) {
					assert.isTrue(browser.isVisible(page.ids.menu[k]));
					assert.equal(browser.getClass2(page.ids.menu[k]), page.classes.menu.closed);
				}
			}
		});

		it('Menu bar filename should not be displayed', () => {
			assert.isFalse(browser.isExisting(page.ids.filename_container));
		});

		it('Click on File menu should open it', () => {
			browser.click(page.ids.menu.file);
			assert.equal(browser.getClass2(page.ids.menu.file), page.classes.menu.open);
			assert.equal(browser.getClass2(page.ids.menu.edit), page.classes.menu.closed);
			browser.click(page.ids.menu.edit);
			assert.equal(browser.getClass2(page.ids.menu.file), page.classes.menu.closed);
			assert.equal(browser.getClass2(page.ids.menu.edit), page.classes.menu.open);
		});

		it("'File -> Open' and 'File -> Import' should be enabled, everything else disabled", () => {
			assert.equal(browser.getClass2(page.ids.sub_menu.file.open), page.classes.menu.enabled);
			assert.equal(browser.getClass2(page.ids.sub_menu.file.open_recent), page.classes.menu.disabled);
			assert.equal(browser.getClass2(page.ids.sub_menu.file.close), page.classes.menu.disabled);
			assert.equal(browser.getClass2(page.ids.sub_menu.file.save), page.classes.menu.disabled);
			assert.notEqual(browser.getClass2(page.ids.sub_menu.file.import_model), page.classes.menu.disabled);
			assert.equal(browser.getClass2(page.ids.sub_menu.file.save_template), page.classes.menu.disabled);
		});

		it("'Edit', 'View' and 'Export' menus should all be disabled", () => {
			const menu = page.ids.sub_menu;
			const menus = [
				menu.edit.undo, menu.edit.redo, menu.edit.snap_to, menu.edit.brick_colors,
				menu.view.add_horizontal_guide,
				menu.export.generate_pdf, menu.export.generate_png_images
			];
			for (let i = 0; i < menus.length; i++) {
				assert.equal(browser.getClass2(menus[i]), page.classes.menu.disabled);
			}
		});

		it('Click outside menu should close menu', () => {
			browser.click(page.ids.page_canvas);
			assert.equal(browser.getClass2(page.ids.menu.file), page.classes.menu.closed);
		});
	});

	it('Tree container should exist and be empty', () => {
		assert.isTrue(browser.isVisible(page.ids.tree));
		assert.isEmpty(browser.getText2(page.ids.tree));
	});

	it('Page Canvas should exist and be blank', () => {
		assert.isTrue(browser.isVisible(page.ids.page_canvas));
		assert.isTrue(page.isPageCanvasBlank());
	});

	it('Highlight should be invisible', () => {
		assert.isTrue(browser.isExisting(page.ids.highlight));
		assert.isFalse(page.highlight.isVisible());
	});

	it('Click initial empty page should not highlight', () => {
		browser.click(page.ids.page_canvas);
		assert.isFalse(page.highlight.isVisible());
	});

	it('Status bar should exist and be empty', () => {
		assert.isTrue(browser.isVisible(page.ids.status_bar));
		assert.isEmpty(browser.getText2(page.ids.status_bar));
	});

	it('Nothing should be saved to localStorage', () => {
		assert.isNull(browser.localStorage('GET', 'lic_state').value);
	});

	describe('Left / right splitter should work', () => {

		const size = browser.getElementSizeFloor2.bind(browser);

		it('Splitter should be visible, tree 20% canvas 80%', () => {
			assert.isTrue(browser.isVisible(page.ids.splitter));
			assert.isTrue(browser.isVisible(page.ids.left_pane));
			assert.isTrue(browser.isVisible(page.ids.right_pane));
			const bodyWidth = size(page.ids.root_container).width;
			const leftPanelWidth = size(page.ids.left_pane).width;
			const rightPaneWidth = size(page.ids.right_pane).width;
			assert.equal(Math.floor(bodyWidth * 0.2), Math.floor(leftPanelWidth + 2.5));
			assert.equal(Math.floor(bodyWidth * 0.8), Math.floor(rightPaneWidth + 2.5));
		});

		it('Drag splitter should resize left & right panels', () => {
			const leftPanelWidth = browser.getElementSize(page.ids.left_pane).width;
			const rightPaneWidth = browser.getElementSize(page.ids.right_pane).width;
			browser.drag2(page.ids.splitter, -10, 0);
			assert.equal(leftPanelWidth - 10, size(page.ids.left_pane).width);
			assert.equal(rightPaneWidth + 10, size(page.ids.right_pane).width);
			browser.drag2(page.ids.splitter, 61, 0);
			assert.equal(leftPanelWidth + 50, size(page.ids.left_pane).width);
			assert.equal(rightPaneWidth - 50, size(page.ids.right_pane).width);
		});

		it('Drag splitter too far left / right should only shrink so much', () => {
			const bodyWidth = size(page.ids.root_container).width;
			browser.drag2(page.ids.splitter, -200, 0);
			assert.equal(100, size(page.ids.left_pane).width);
			assert.equal(Math.floor(bodyWidth) - 105, size(page.ids.right_pane).width);
			const pageWidth = page.getStoreState('pageSize').width;
			browser.drag2(page.ids.splitter, 500, 0);
			assert.equal(bodyWidth - pageWidth - 15, size(page.ids.left_pane).width);
			assert.equal(pageWidth + 10, size(page.ids.right_pane).width);
		});
	});
});
