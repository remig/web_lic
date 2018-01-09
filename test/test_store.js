/* global require: false, describe: false, it: false, before: false, after: false */

'use strict';
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;
const sinon = require('sinon');

const util = require('../src/util');
const store = require('../src/store');

// These will come from the template page, when we have one
const pageMargin = 20;
const pliMargin = pageMargin / 2;

describe('Test state store module', function() {

	before(function() {
		sinon.stub(util, 'getSubmodel').callsFake(() => {
			return 'hi';
		});
		sinon.stub(util, 'renderCSI').callsFake(() => {
			return {width: 200, height: 100};
		});
		sinon.stub(util, 'renderPLI').callsFake(() => {
			return {width: 50, height: 25};
		});
		sinon.stub(util, 'measureLabel').callsFake(() => {
			return {width: 10, height: 14};
		});
	});

	function verifyInitialState() {
		assert.isEmpty(store.state.modelName);
		assert.isEmpty(store.state.pages);
		assert.isEmpty(store.state.steps);
		assert.isEmpty(store.state.csis);
		assert.isEmpty(store.state.plis);
		assert.isEmpty(store.state.pliItems);
		assert.isEmpty(store.state.pliQtys);
		assert.deepEqual(store.state.pageSize, {width: 800, height: 600});
		assert.equal(store.get.pageCount(), 0);
	};

	it('Initial state should be empty', () => {
		verifyInitialState();
	});

	it('Don\'t crash on invalid page navigation', () => {
		assert.isNull(store.get.prevPage());
		assert.isNull(store.get.prevPage(null));
		assert.isNull(store.get.prevPage(1));
		assert.isNull(store.get.nextPage());
		assert.isNull(store.get.nextPage(null));
		assert.isNull(store.get.nextPage(1));
	});

	it('Store state via mutations', () => {
		store.mutations.setModelName('foobar');
		assert.equal(store.state.modelName, 'foobar');
		store.replaceState({a: 10, b: 20});
		assert.deepEqual(store.state, {a: 10, b: 20});
	});

	it('Clear applied state', () => {
		store.resetState();
		verifyInitialState();
	});

	it('Add a Title Page', () => {
		var pageState = {type: 'page', id: 0, steps: [0]};
		var stepState = {
			type: 'step', id: 0, parent: {type: 'page', id: 0},
			x: pageMargin, y: pageMargin, width: 760, height: 560, csiID: 0
		}
		var csiState = {
			type: 'csi', id: 0, parent: {type: 'step', id: 0},
			x: (800 - 200) / 2 - pageMargin, y: (600 - 100) / 2 - pageMargin,
			width: 200, height: 100
		};
		store.mutations.addTitlePage();
		assert.equal(store.state.pages.length, 1);
		assert.equal(store.state.steps.length, 1);
		assert.equal(store.state.csis.length, 1);
		assert.equal(store.state.plis.length, 0);
		assert.deepEqual(store.state.pages[0], pageState);
		assert.deepEqual(store.state.steps[0], stepState);
		assert.deepEqual(store.state.csis[0], csiState);
		assert.equal(store.get.pageCount(), 1);
		assert.isNull(store.get.nextPage(0));
		assert.isNull(store.get.prevPage(0));
		assert.deepEqual(store.get.parent(store.state.steps[0]), pageState);
		assert.deepEqual(store.get.parent(store.state.csis[0]), stepState);
		assert.deepEqual(store.get.pageForItem(store.state.steps[0]), pageState);
		assert.deepEqual(store.get.pageForItem(store.state.csis[0]), pageState);
	});

	after(function() { });
});
