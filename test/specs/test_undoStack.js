'use strict';
const chai = require('chai');
chai.use(require('chai-string'));
const assert = chai.assert;

const util = require('../../src/util');
const UndoStack = require('../../src/undoStack');
const fakeStore = {
	state: {
		foo: 0,
		bar: 5
	},
	replaceState(newState) {
		fakeStore.state = newState;
	},
	save() {
	},
	mutations: {
		fakeMutation1() {
			fakeStore.state.foo++;
		},
		fakeMutation2(v) {
			fakeStore.state.bar = v;
		}
	}
};

describe('Test undoStack module', function() {

	it('Instantiate new empty undoStack', () => {
		const stack = new UndoStack();
		assert.isEmpty(stack.stack);
		assert.equal(stack.index, -1);
		assert.notExists(stack.store);
		const stack2 = UndoStack(fakeStore);
		assert.equal(stack2.store, fakeStore);
	});

	function assertStackEmpty(stack) {
		assert.isFalse(stack.isUndoAvailable());
		assert.isFalse(stack.isRedoAvailable());
		assert.isEmpty(stack.stack);
		assert.equal(stack.index, -1);
		assert.isEmpty(stack.undoText());
	}

	it('Test methods on empty stack', () => {
		const stack = new UndoStack(fakeStore);
		assert.isFalse(stack.isUndoAvailable());
		assert.isFalse(stack.isRedoAvailable());
		assert.isEmpty(stack.undoText());
		assert.isEmpty(stack.redoText());

		stack.undo();
		assertStackEmpty(stack);

		stack.redo();
		assertStackEmpty(stack);

		stack.clear();
		assertStackEmpty(stack);
	});

	it('Test setting base state', () => {
		const stack = new UndoStack(fakeStore);
		stack.saveBaseState();
		assert.equal(stack.index, 0);
		assert.equal(stack.stack.length, 1);
		const baseState = stack.stack[0];
		assert.isNull(baseState.text);
		assert.equal(baseState.state.bar, 5);
		fakeStore.state.bar = 30;
		assert.equal(baseState.state.bar, 5);  // ensure state was cloned
		assert.isFalse(stack.isUndoAvailable());
		assert.isFalse(stack.isRedoAvailable());
		stack.undo();
		assert.equal(stack.index, 0);
		stack.redo();
		assert.equal(stack.index, 0);
	});

	it('Test commit', () => {
		const stack = new UndoStack(fakeStore);
		stack.saveBaseState();
		assert.equal(fakeStore.state.foo, 0);
		stack.commit('fakeMutation1', null, 'Fake Mutation');
		assert.equal(fakeStore.state.foo, 1);
		assert.equal(stack.index, 1);
		assert.equal(stack.stack.length, 2);
		assert.isTrue(stack.isUndoAvailable());
		assert.equal(stack.undoText(), 'Fake Mutation');

		stack.undo();
		assert.equal(fakeStore.state.foo, 0);
		assert.isFalse(stack.isUndoAvailable());
		assert.isTrue(stack.isRedoAvailable());
		assert.equal(stack.redoText(), 'Fake Mutation');
		assert.equal(stack.index, 0);
		stack.undo();
		assert.equal(fakeStore.state.foo, 0);
		assert.equal(stack.index, 0);

		stack.redo();
		assert.equal(stack.index, 1);
		assert.equal(fakeStore.state.foo, 1);
		assert.isTrue(stack.isUndoAvailable());
		assert.isFalse(stack.isRedoAvailable());
		stack.redo();
		assert.equal(stack.index, 1);

		stack.commit('fakeMutation1', null, 'Fake Mutation');
		stack.commit('fakeMutation1', null, 'Fake Mutation');
		stack.commit('fakeMutation1', null, 'Fake Mutation');
		stack.commit('fakeMutation1', null, 'Fake Mutation');
		assert.equal(stack.index, 5);
		assert.equal(fakeStore.state.foo, 5);

		stack.undo();
		stack.undo();
		stack.undo();
		assert.equal(stack.index, 2);
		stack.commit('fakeMutation2', 550, 'Another Fake Mutation');
		assert.equal(stack.index, 3);
		assert.equal(fakeStore.state.bar, 550);
		assert.equal(stack.undoText(), 'Another Fake Mutation');
	});
});
