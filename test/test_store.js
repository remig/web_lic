/* global require: false, describe: false, before: false, after: false */

'use strict';
var chai = require('chai');
chai.use(require('chai-string'));
var assert = chai.assert;

const store = require('../src/store');

describe('Test state store module', function() {

	before(function() { });

	it('Initial state should be empty', () => {
		assert.isEmpty(store.state.modelName);
		assert.isEmpty(store.state.pages);
		assert.isEmpty(store.state.steps);
		assert.isEmpty(store.state.csis);
		assert.isEmpty(store.state.plis);
		assert.isEmpty(store.state.pliItems);
		assert.isEmpty(store.state.pliQtys);
		assert.deepEqual(store.state.pageSize, {width: 800, height: 600});
		assert.equal(store.get.pageCount(), 0);
	});

	it('Don\'t crash on invalid page navigation', () => {
		assert.isNull(store.get.prevPage());
		assert.isNull(store.get.prevPage(null));
		assert.isNull(store.get.prevPage(1));
		assert.isNull(store.get.nextPage());
		assert.isNull(store.get.nextPage(null));
		assert.isNull(store.get.nextPage(1));
	});

	it('Should store state via mutations', () => {
		store.mutations.setModelName('foobar');
		assert.equal(store.state.modelName, 'foobar');
	});

	after(function() {
	});
});
