'use strict';
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;

const store = require('../../src/store');

store.state = {foo: 0, bar: 5};
store.save = () => {};
store.mutations = {
	fakeMutation1() {
		store.state.foo++;
	},
	fakeMutation2(v) {
		store.state.bar = v;
	}
};

const undoStack = require('../../src/undoStack');

function assertStackEmpty(stack) {
	assert.isFalse(stack.isUndoAvailable());
	assert.isFalse(stack.isRedoAvailable());
	assert.isEmpty(stack.getState().stack);
	assert.equal(stack.getIndex(), -1);
	assert.isEmpty(stack.undoText());
	assert.isEmpty(stack.redoText());
}

describe('Test undoStack module', function() {

	it('ensure new undoStack is empty', () => {
		assertStackEmpty(undoStack);
	});

	it('undo, redo & clear should not alter empty stack', () => {
		undoStack.undo();
		assertStackEmpty(undoStack);

		undoStack.redo();
		assertStackEmpty(undoStack);

		undoStack.clear();
		assertStackEmpty(undoStack);
	});

	it('Test setting base state', () => {
		undoStack.saveBaseState();
		const state = undoStack.getState();
		assert.equal(state.index, 0);
		assert.equal(state.stack.length, 1);
		const baseState = state.stack[0];
		assert.isNull(baseState.undoText);
		assert.equal(baseState.state.bar, 5);
		store.state.bar = 30;
		assert.equal(baseState.state.bar, 5);  // ensure state was cloned
		assert.isFalse(undoStack.isUndoAvailable());
		assert.isFalse(undoStack.isRedoAvailable());
		undoStack.undo();
		assert.equal(undoStack.getIndex(), 0);
		undoStack.redo();
		assert.equal(undoStack.getIndex(), 0);
	});

	it('clear should empty stack', () => {
		undoStack.clear();
		assertStackEmpty(undoStack);
	});

	it('Test commit', () => {
		undoStack.saveBaseState();
		const state = undoStack.getState();
		assert.equal(store.state.foo, 0);
		undoStack.commit('fakeMutation1', null, 'Fake Mutation');
		assert.equal(store.state.foo, 1);
		assert.equal(undoStack.getIndex(), 1);
		assert.equal(state.stack.length, 2);
		assert.isTrue(undoStack.isUndoAvailable());
		assert.equal(undoStack.undoText(), 'Fake Mutation');

		undoStack.undo();
		assert.equal(store.state.foo, 0);
		assert.isFalse(undoStack.isUndoAvailable());
		assert.isTrue(undoStack.isRedoAvailable());
		assert.equal(undoStack.redoText(), 'Fake Mutation');
		assert.equal(undoStack.getIndex(), 0);
		undoStack.undo();
		assert.equal(store.state.foo, 0);
		assert.equal(undoStack.getIndex(), 0);

		undoStack.redo();
		assert.equal(undoStack.getIndex(), 1);
		assert.equal(store.state.foo, 1);
		assert.isTrue(undoStack.isUndoAvailable());
		assert.isFalse(undoStack.isRedoAvailable());
		undoStack.redo();
		assert.equal(undoStack.getIndex(), 1);

		undoStack.commit('fakeMutation1', null, 'Fake Mutation');
		undoStack.commit('fakeMutation1', null, 'Fake Mutation');
		undoStack.commit('fakeMutation1', null, 'Fake Mutation');
		undoStack.commit('fakeMutation1', null, 'Fake Mutation');
		assert.equal(undoStack.getIndex(), 5);
		assert.equal(store.state.foo, 5);

		undoStack.undo();
		undoStack.undo();
		undoStack.undo();
		assert.equal(undoStack.getIndex(), 2);
		undoStack.commit('fakeMutation2', 550, 'Another Fake Mutation');
		assert.equal(undoStack.getIndex(), 3);
		assert.equal(store.state.bar, 550);
		assert.equal(undoStack.undoText(), 'Another Fake Mutation');
	});

	it('clear should empty stack', () => {
		undoStack.clear();
		assertStackEmpty(undoStack);
	});
});
