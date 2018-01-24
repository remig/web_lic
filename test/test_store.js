/* global require: false, describe: false, it: false, before: false, after: false */

'use strict';
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;
const sinon = require('sinon');

const LDParse = require('../src/LDParse');
const util = require('../src/util');
const store = require('../src/store');
const trivial_part_dict = require('./trivial_part_dict.json');

// These will come from the template page, when we have one
const pageMargin = 20;
const pliMargin = pageMargin / 2;

describe('Test state store module', function() {

	before(function() {
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
		assert.isEmpty(store.state.labels);
		assert.deepEqual(store.state.pageSize, {width: 900, height: 700});
		assert.equal(store.get.pageCount(), 0);
	}

	it('store exists with all public API', () => {
		assert.exists(store.state);
		assert.exists(store.replaceState);
		assert.exists(store.resetState);
		assert.exists(store.get);
		assert.exists(store.get.pageCount);
		assert.exists(store.get.modelName);
		assert.exists(store.get.modelNameBase);
		assert.exists(store.get.isTitlePage);
		assert.exists(store.get.isFirstPage);
		assert.exists(store.get.isLastPage);
		assert.exists(store.get.nextPage);
		assert.exists(store.get.prevPage);
		assert.exists(store.get.titlePage);
		assert.exists(store.get.firstPage);
		assert.exists(store.get.lastPage);
		assert.exists(store.get.parent);
		assert.exists(store.get.pageForItem);
		assert.exists(store.get.lookupToItem);
		assert.exists(store.get.itemToLookup);
		assert.exists(store.mutations);
		assert.exists(store.mutations.addStateItem);
		assert.exists(store.mutations.moveItem);
		assert.exists(store.mutations.setModelName);
		assert.exists(store.mutations.moveStepToPreviousPage);
		assert.exists(store.mutations.moveStepToNextPage);
		assert.exists(store.mutations.mergeSteps);
		assert.exists(store.mutations.deletePage);
		assert.exists(store.mutations.deleteStep);
		assert.exists(store.mutations.renumber);
		assert.exists(store.mutations.renumberSteps);
		assert.exists(store.mutations.renumberPages);
		assert.exists(store.mutations.setNumber);
		assert.exists(store.mutations.layoutStep);
		assert.exists(store.mutations.layoutPage);
		assert.exists(store.mutations.layoutTitlePage);
		assert.exists(store.mutations.addTitlePage);
		assert.exists(store.mutations.addInitialPages);
	});


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

	const titlePageState = {type: 'page', id: 0, steps: [0], labels: [0, 1]};
	const pageState = {type: 'page', id: 1, needsLayout: true, number: 1, numberLabel: 0, steps: [1]};
	const step0State = {
		type: 'step', id: 0, parent: {type: 'page', id: 0},
		x: null, y: null, width: null, height: null, csiID: 0
	};
	const step1State = {
		type: 'step', id: 1, parent: {type: 'page', id: 1}, number: 1, numberLabel: 0,
		x: null, y: null, width: null, height: null, csiID: 1, parts: [0], pliID: 0, submodel: []
	};
	const csiState = {
		type: 'csi', id: 0, parent: {type: 'step', id: 0},
		x: null, y: null,
		width: null, height: null
	};
	it('Add a Title Page', () => {
		store.mutations.addTitlePage();
		assert.equal(store.state.pages.length, 1);
		assert.equal(store.state.steps.length, 1);
		assert.equal(store.state.csis.length, 1);
		assert.equal(store.state.plis.length, 0);
		assert.deepEqual(store.state.pages[0], titlePageState);
		assert.deepEqual(store.state.steps[0], step0State);
		assert.deepEqual(store.state.csis[0], csiState);
		assert.equal(store.get.pageCount(), 1);
		assert.isNull(store.get.nextPage(0));
		assert.isNull(store.get.prevPage(0));
		assert.deepEqual(store.get.parent(store.state.steps[0]), titlePageState);
		assert.deepEqual(store.get.parent(store.state.csis[0]), step0State);
		assert.deepEqual(store.get.pageForItem(store.state.steps[0]), titlePageState);
		assert.deepEqual(store.get.pageForItem(store.state.csis[0]), titlePageState);
	});

	it('Import trivial model', () => {
		store.resetState();
		store.model = trivial_part_dict['trivial_model.ldr'];
		store.mutations.addTitlePage();
		store.mutations.addInitialPages(trivial_part_dict);
		assert.equal(store.state.pages.length, 4);
		assert.deepEqual(store.state.pages[0], titlePageState);
		assert.deepEqual(store.state.pages[1], pageState);
		assert.equal(store.state.steps.length, 4);
		assert.deepEqual(store.state.steps[0], step0State);
		assert.deepEqual(store.state.steps[1], step1State);
	});

	after(function() { });
});
