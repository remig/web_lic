/* global jsonpatch: false */
'use strict';

import _ from './util';
import store from './store';

// stack is an array of state; undoStack[0] is the initial 'base' state (after model open / import) that cannot be undone.
// index points to the currently visible state in the UI.
// TODO: don't let this grow unbound - support max undo stack size.  Need performance metrics here, for decent max stack size.
// TODO: check if previous undo stack entry has same text as newest one; if so, merge them (if allowed & sensical)

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

	// Perform a new state mutation action then push it to the undo / redo stack
	// change is either a string matching an entry in store.mutations,
	// or an object with {undo, redo} JSON patch operations,
	// or an object with properties {mutations, action}.
	// 'mutations' is an array of strings matching store.mutation entries.
	// 'action' is a {undo, redo} JSON patch operation.
	// clearCacheTargets is an array of either:
	//  - items or {id, type} selectionItems that will get their 'isDirty' flag set when an undo / reo
	//  - a item type string like 'csi', which resets all items of that type
	commit(change, opts, undoText, clearCacheTargets) {

		if (typeof change === 'string') {
			change = {
				mutations: [change]
			};
		} else if (change.hasOwnProperty('undo') && change.hasOwnProperty('redo')) {
			change = {
				action: change
			};
		}

		(change.mutations || []).forEach(mutation => {
			mutation = _.get(mutation, store.mutations);
			if (mutation) {
				mutation(opts);  // Perform the actual state mutation
			}
		});

		if (change.action) {
			change.action.redo.forEach(action => {
				jsonpatch.applyOperation(action.root, action);
			});
		}

		if (state.index < state.stack.length - 1) {
			// If there's undo actions after the 'current' action, delete them
			state.stack.splice(state.index + 1);
		}

		let newState;
		if (_.isEmpty(change.mutations)) {
			newState = state.stack[state.stack.length - 1].state;  // If we have no new state, reuse previous stack state entry
		} else {
			newState = _.clone(store.state);
		}

		// TODO: state can be really big; consider switching store.mutations to JSON-patch
		state.stack.push({
			state: newState,
			action: change.action,
			undoText,
			clearCacheTargets
		});
		setIndex(state, state.index + 1);

		performClearCacheTargets(state.index - 1, state.index);

		setStateTimer();
	},

	// Copy the store's current state into the undoStack's initial base state
	saveBaseState() {
		state.stack = [{state: _.clone(store.state), undoText: null}];
		setIndex(state, 0);
	},

	// TODO: Need automatic way of navigating to and redrawing whatever was most affected by undo / redo action
	undo() {
		if (api.isUndoAvailable()) {
			performUndoRedoAction('undo', state.index - 1);
		}
	},

	redo() {
		if (api.isRedoAvailable()) {
			performUndoRedoAction('redo', state.index + 1);
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
		return `Undo ${api.isUndoAvailable() ? state.stack[state.index].undoText : ''}`;
	},

	redoText() {
		return `Redo ${api.isRedoAvailable() ? state.stack[state.index + 1].undoText : ''}`;
	}
};

function performUndoRedoAction(undoOrRedo, newIndex) {

	const newStack = state.stack[newIndex];
	const newState = _.clone(newStack.state);
	store.replaceState(newState);

	const actionStack = (undoOrRedo === 'undo') ? state.stack[state.index] : newStack;
	if (actionStack.action) {
		actionStack.action[undoOrRedo].forEach(action => {
			jsonpatch.applyOperation(action.root, action);
		});
	}

	performClearCacheTargets(state.index, newIndex);
	state.index = newIndex;

	if (state.onChangeCB) {
		state.onChangeCB();
	}
}

function performClearCacheTargets(prevIndex, newIndex) {
	const clearCacheTargets = [], stack = state.stack;
	if (stack[prevIndex] && stack[prevIndex].clearCacheTargets) {
		clearCacheTargets.push(...stack[prevIndex].clearCacheTargets);
	}
	if (stack[newIndex] && stack[newIndex].clearCacheTargets) {
		clearCacheTargets.push(...stack[newIndex].clearCacheTargets);
	}
	clearCacheTargets.forEach(item => {
		if (typeof item === 'string') {
			store.state[item + 's'].forEach(item => (item.isDirty = true));
		} else {
			item = {type: item.type, id: item.id};  // Some cache items were cloned from previous states; ensure we pull only the actual item from the current state
			item = store.get.lookupToItem(item);
			if (item) {
				item.isDirty = true;
			}
		}
	});
}

function setIndex(stack, newIndex) {
	stack.index = newIndex;
	if (stack.onChangeCB) {
		stack.onChangeCB();
	}
}

function setStateTimer() {
	// Save the current state to local storage if we haven't saved it in the last 30 seconds
	// Need 'typeof setTimeout' check to not crash in unit tests
	if (typeof setTimeout === 'function' && state.localStorageTimer == null) {
		store.save('local');
		state.localStorageTimer = setTimeout(() => {
			state.localStorageTimer = null;
		}, 30 * 1000);
	}
}

export default api;
