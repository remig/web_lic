/* global browser: false */

'use strict';
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;
const page = require('../page_api')(browser, assert);

describe('Test Navigation Tree', function() {

	before(() => {
		page.importTrivialModel();
	});

	it('Verify initial tree content', () => {
		assert.equal(browser.elements(page.selectors.tree.topLevelRows).value.length, 4);
		const treeTextNodes = browser.elements(page.selectors.tree.textContainers).value;
		assert.equal(treeTextNodes.length, 26);
		assert.equal(browser.getText2(treeTextNodes[0]), 'Title Page');
		assert.isEmpty(browser.getText2(treeTextNodes[1]), '');  // Invisible nodes have no text in webdriver's world
		assert.equal(browser.getText2(treeTextNodes[5]), 'Page 1');
		assert.equal(browser.getText2(treeTextNodes[12]), 'Page 2');
		assert.equal(browser.getText2(treeTextNodes[19]), 'Page 3');
		treeTextNodes.forEach(el => {
			assert.equal(browser.getClass2(el), page.classes.tree.childRow.unhighlighted);
		});

		const treeIcons = browser.elements(page.selectors.tree.arrowIcons).value;
		assert.equal(treeIcons.length, 11);
		treeIcons.forEach(el => {
			assert.equal(browser.getClass2(el), page.classes.tree.parentRow.closed);
		});

		const treeChildren = browser.elements(page.selectors.tree.childRows).value;
		assert.equal(treeChildren.length, 11);
		treeChildren.forEach(el => {
			assert.equal(browser.getClass2(el), page.classes.tree.subMenu.hidden);
		});
	});

	it('Click closed parent row should expand it', () => {
		const titlePageSelector = page.selectors.tree.parentRow('titlePage', 0);
		browser.click(titlePageSelector.arrow);
		assert.equal(browser.getClass2(titlePageSelector.arrow), page.classes.tree.parentRow.open);
		assert.equal(browser.getClass2(titlePageSelector.subMenu), page.classes.tree.subMenu.visible);
		assert.equal(browser.getText2(page.selectors.tree.childRow('label', 0)), 'Trivial Model');
		assert.equal(browser.getText2(page.selectors.tree.childRow('label', 1)), '3 Parts, 3 Pages');

		const step0Selector = page.selectors.tree.parentRow('step', 3);
		assert.equal(browser.getText2(step0Selector.text), 'Step');
		assert.equal(browser.getClass2(step0Selector.arrow), page.classes.tree.parentRow.closed);
		assert.equal(browser.getClass2(step0Selector.subMenu), page.classes.tree.subMenu.hidden);

		browser.click(step0Selector.arrow);
		assert.equal(browser.getClass2(step0Selector.arrow), page.classes.tree.parentRow.open);
		assert.equal(browser.getClass2(step0Selector.subMenu), page.classes.tree.subMenu.visible);
		assert.equal(browser.getText2(page.selectors.tree.childRow('csi', 3)), 'CSI');

		browser.click(step0Selector.arrow);
		assert.equal(browser.getClass2(step0Selector.arrow), page.classes.tree.parentRow.closed);
		assert.equal(browser.getClass2(step0Selector.subMenu), page.classes.tree.subMenu.hidden);
		assert.equal(browser.getText2(page.selectors.tree.childRow('csi', 3)), '');

		browser.click(titlePageSelector.arrow);
		assert.equal(browser.getClass2(titlePageSelector.arrow), page.classes.tree.parentRow.closed);
		assert.equal(browser.getClass2(titlePageSelector.subMenu), page.classes.tree.subMenu.hidden);
		assert.equal(browser.getText2(page.selectors.tree.childRow('label', 0)), '');
	});

	it('Click rows should highlight target on canvas', () => {
		const titlePageSelector = page.selectors.tree.parentRow('titlePage', 0);
		browser.click(titlePageSelector.text);
		assert.equal(browser.getClass2(titlePageSelector.arrow), page.classes.tree.parentRow.open);
		assert.equal(browser.getClass2(titlePageSelector.subMenu), page.classes.tree.subMenu.visible);
		assert.isTrue(page.highlight.isVisible());
		assert.isTrue(page.highlight.isValid(-5, -5, 906, 706));
		assert.equal(browser.getClass2(titlePageSelector.text), page.classes.tree.childRow.highlighted);

		const labelSelector = page.selectors.tree.childRow('label', 0);
		browser.click(labelSelector);
		assert.equal(browser.getClass2(titlePageSelector.text), page.classes.tree.childRow.unhighlighted);
		assert.equal(browser.getClass2(labelSelector), page.classes.tree.childRow.highlighted);
		assert.isTrue(page.highlight.isValid(370, 130, 157, 36));
	});

	it('Click canvas should highlight related row', () => {
		const canvasSize = browser.getElementSize(page.ids.pageCanvas);
		browser.leftClick(page.ids.pageCanvas, canvasSize.width / 2, 550);
		assert.equal(
			browser.getClass2(page.selectors.tree.childRow('label', 0)),
			page.classes.tree.childRow.unhighlighted
		);
		assert.equal(
			browser.getClass2(page.selectors.tree.childRow('label', 1)),
			page.classes.tree.childRow.highlighted
		);
		assert.isTrue(page.highlight.isValid(366, 542, 164, 30));

		const csiSelector = page.selectors.tree.childRow('csi', 3);
		const step0Selector = page.selectors.tree.parentRow('step', 3);
		browser.leftClick(page.ids.pageCanvas, canvasSize.width / 2, canvasSize.height / 2);
		assert.equal(
			browser.getClass2(page.selectors.tree.childRow('label', 1)),
			page.classes.tree.childRow.unhighlighted
		);
		assert.equal(browser.getClass2(csiSelector), page.classes.tree.childRow.highlighted);
		assert.equal(browser.getText2(csiSelector), 'CSI');
		assert.equal(browser.getClass2(step0Selector.arrow), page.classes.tree.parentRow.open);
		assert.equal(browser.getClass2(step0Selector.subMenu), page.classes.tree.subMenu.visible);
		assert.isTrue(page.highlight.isValid(388, 309, 122, 80));
	});

	it('Move page element should not alter tree open / close state', () => {
		const page0 = page.selectors.tree.parentRow('page', 0);
		const page1 = page.selectors.tree.parentRow('page', 1);
		browser.click(page0.arrow);
		browser.click(page1.arrow);
		assert.equal(browser.getClass2(page0.arrow), page.classes.tree.parentRow.open);
		assert.equal(browser.getClass2(page1.arrow), page.classes.tree.parentRow.open);
		const canvasSize = browser.getElementSize(page.ids.pageCanvas);
		browser.leftClick(page.ids.pageCanvas, canvasSize.width / 2, canvasSize.height / 2);
		browser.keys(['ArrowRight', 'ArrowRight']);
		assert.equal(browser.getClass2(page0.arrow), page.classes.tree.parentRow.open);
		assert.equal(browser.getClass2(page1.arrow), page.classes.tree.parentRow.open);
	});
});
