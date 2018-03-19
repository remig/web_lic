'use strict';

const util = require('./util');
const store = require('./store');

// stack is an array of state; undoStack[0] is the initial 'base' state (after model open / import) that cannot be undone.
// index points to the currently visible state in the UI.
// TODO: don't let this grow unbound - support max undo stack size.  Need performance metrics here, for decent max stack size.

const state = {
	stack: [],
	index: -1,
	localStorageTimer: null,
	onChangeCB: null
};

const api = {

	onChange(onChangeCB) {
		state.onChangeCB = onChangeCB;
	},

	commit(mutationName, opts, undoText) {

		util.get(mutationName, store.mutations)(opts);  // Perform the actual action

		if (state.index < state.stack.length - 1) {
			// If there's undo actions after the 'current' action, delete them
			state.stack.splice(state.index + 1);
		}
		state.stack.push({
			state: util.clone(store.state),
			text: undoText || ''
		});
		setIndex(state, state.index + 1);

		// Save the current state to localStorage if we haven't saved it in the last 30 seconds
		// Need 'typeof setTimeout' check to not crash in unit tests
		if (typeof setTimeout === 'function' && state.localStorageTimer == null) {
			store.save('localStorage');
			state.localStorageTimer = setTimeout(() => {
				state.localStorageTimer = null;
			}, 30 * 1000);
		}
	},

	// Copy the store's current state into the undoStack's initial base state
	saveBaseState() {
		state.stack = [{state: util.clone(store.state), text: null}];
		setIndex(state, 0);
	},

	undo() {
		if (api.isUndoAvailable()) {
			setIndex(state, state.index - 1);
			const newState = util.clone(state.stack[state.index].state);
			store.replaceState(newState);
		}
	},

	redo() {
		if (api.isRedoAvailable()) {
			setIndex(state, state.index + 1);
			const newState = util.clone(state.stack[state.index].state);
			store.replaceState(newState);
		}
	},

	clear() {
		state.stack = [];
		setIndex(state, -1);
	},

	getIndex() {
		return state.index;
	},

	getState() {
		return state;
	},

	isUndoAvailable() {
		return state.index > 0;
	},

	isRedoAvailable() {
		return state.index < state.stack.length - 1;
	},

	undoText() {
		return api.isUndoAvailable() ? state.stack[state.index].text : '';
	},

	redoText() {
		return api.isRedoAvailable() ? state.stack[state.index + 1].text : '';
	}
};

function setIndex(stack, newIndex) {
	stack.index = newIndex;
	if (stack.onChangeCB) {
		stack.onChangeCB();
	}
}

module.exports = api;
