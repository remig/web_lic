/* Web Lic - Copyright (C) 2018 Remi Gagne */

/* global jsonpatch: false */

import _ from './util';
import store from './store';
import {tr, noTranslate} from './translations';

// stack is an array of state
// undoStack[0] is the initial 'base' state (after model open / import) that cannot be undone
// index points to the currently visible state in the UI.
// TODO: don't let this grow unbound. Support max undo stack size.
// TODO: Need performance metrics for decent max stack size.
// TODO: check if previous undo stack entry has same text as newest one; if so, merge them (if sensical)

interface UndoState {
	stack: UndoStackEntry[];
	index: number;
	localStorageTimer: any;
	onChangeCB?: (() => void) | null;
}

interface UndoStackEntry {
	state: any;
	actionList?: ActionChange[];
	undoText?: string | null;
	clearCacheTargets?: ClearCacheTarget[];
}

const state: UndoState = {
	stack: [],
	index: -1,
	localStorageTimer: null,
	onChangeCB: null,
};

interface UndoRedoAction {
	root: any, op: string, path: string, value?: any
}

interface ActionChange {
	undo: UndoRedoAction[],
	redo: UndoRedoAction[],
}

interface MutationChange {
	mutation: string,
	opts: any,
}

type ClearCacheTarget =
	{type: 'csi', id: number} | {type: 'pliItem', id: number}
	| CSI | PLIItem | 'csi' |'pliItem' | 'renderer';

const api = {

	onChange(onChangeCB: () => void) {
		state.onChangeCB = onChangeCB;
	},

	// Perform a new state mutation action then push it to the undo / redo stack.
	// changeList is an array of changes.
	// A change is either a string matching an entry in store.mutations,
	// or an object with {mutation, opts} mutation operation,
	// or an object with {undo, redo} JSON patch operations.
	// 'mutation' is an array of strings matching store.mutation entries.
	// 'action' is a {undo, redo} JSON patch operation.
	// clearCacheTargets is an array of either:
	//  - items or {id, type} selectionItems that will get their 'isDirty' flag set when an undo / reo
	//  - a item type string like 'csi', which resets all items of that type
	commit(
		changeList: string | ActionChange | (MutationChange | ActionChange)[],
		opts: any,
		undoText: string,
		clearCacheTargets?: ClearCacheTarget[]
	) {

		let localChangeList: (MutationChange | ActionChange)[];
		if (typeof changeList === 'string') {
			localChangeList = [{mutation: changeList, opts}];
		} else if (isAction(changeList)) {
			localChangeList = [changeList];
		} else {
			localChangeList = changeList;
		}

		performClearCacheTargets(state.index - 1, state.index);

		// We now have an array of mutation & action objects.  Apply it
		localChangeList.forEach(change => {
			if (isMutation(change)) {
				const mutation = _.get(store.mutations, change.mutation);
				if (mutation) {
					mutation(change.opts);
				}
			} else if (isAction(change)) {
				change.redo.forEach((action: UndoRedoAction) => {
					jsonpatch.applyOperation(action.root, action);
				});
			}
		});

		if (state.index < state.stack.length - 1) {
			// If there's undo actions after the 'current' action, delete them
			state.stack.splice(state.index + 1);
		}

		let newState;
		if (_.isEmpty(localChangeList.filter(isMutation))) {
			// If we have no new state, reuse previous stack state entry
			newState = state.stack[state.stack.length - 1].state;
		} else {
			newState = _.cloneDeep(store.state);
		}

		// TODO: state can be really big; consider switching store.mutations to JSON-patch
		state.stack.push({
			state: newState,
			actionList: localChangeList.filter(isAction),
			undoText,
			clearCacheTargets,
		});
		setIndex(state, state.index + 1);

		performClearCacheTargets(state.index - 1, state.index);

		setStateTimer();
	},

	// Copy the store's current state into the undoStack's initial base state
	saveBaseState() {
		state.stack = [{state: _.cloneDeep(store.state), undoText: null}];
		setIndex(state, 0);
	},

	// TODO: Need automatic way to navigate to and redraw whatever was most affected by undo / redo action
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
		return noTranslate(
			tr(
				'action.edit.undo.name_@c',
				api.isUndoAvailable() ? state.stack[state.index].undoText : ''
			)
		);
	},

	redoText() {
		return noTranslate(
			tr(
				'action.edit.redo.name_@c',
				api.isRedoAvailable() ? state.stack[state.index + 1].undoText : ''
			)
		);
	},
};

function isMutation(change: any): change is MutationChange {
	return change?.hasOwnProperty('mutation') || typeof change === 'string';
}

function isAction(change: any): change is ActionChange {
	return change?.hasOwnProperty('undo') && change?.hasOwnProperty('redo');
}

function performUndoRedoAction(undoOrRedo: 'undo' | 'redo', newIndex: number) {

	const newStack = state.stack[newIndex];
	const newState = _.cloneDeep(newStack.state);
	store.replaceState(newState);

	const actionStack = (undoOrRedo === 'undo') ? state.stack[state.index] : newStack;
	(actionStack.actionList || []).forEach((action: any) => {
		action[undoOrRedo].forEach((subAction: UndoRedoAction) => {
			jsonpatch.applyOperation(subAction.root, subAction);
		});
	});

	performClearCacheTargets(state.index, newIndex);
	state.index = newIndex;

	if (state.onChangeCB) {
		state.onChangeCB();
	}
}

function performClearCacheTargets(prevIndex: number, newIndex: number) {
	const clearCacheTargets = [], stack = state.stack;
	if (stack[prevIndex] && stack[prevIndex].clearCacheTargets) {
		clearCacheTargets.push(...stack[prevIndex].clearCacheTargets);
	}
	if (stack[newIndex] && stack[newIndex].clearCacheTargets) {
		clearCacheTargets.push(...stack[newIndex].clearCacheTargets);
	}
	clearCacheTargets.forEach(item => {
		if (typeof item === 'string') {
			if (item === 'renderer') {  // Special case: refresh renderer settings
				store.mutations.sceneRendering.refreshAll();
			} else if (item === 'csi' || item === 'pliItem') {
				store.mutations[item].markAllDirty();
			}
		} else {
			// Some cache items were cloned from previous states;
			// ensure we pull only the actual item from the current state
			const localItemLookup = {type: item.type, id: item.id};
			const localItem = store.get.lookupToItem(localItemLookup);
			if (localItem && (localItem.type === 'csi' || localItem.type === 'pliItem')) {
				localItem.isDirty = true;
			}
		}
	});
}

function setIndex(stack: UndoState, newIndex: number) {
	stack.index = newIndex;
	if (stack && stack.onChangeCB) {
		stack.onChangeCB();
	}
}

function setStateTimer() {
	// Save the current state to local storage if we haven't saved it in the last 30 seconds
	// Need 'typeof setTimeout' check to not crash in unit tests
	if (typeof setTimeout === 'function' && state.localStorageTimer == null) {
		store.saveLocal();
		state.localStorageTimer = setTimeout(() => {
			state.localStorageTimer = null;
		}, 30);
	}
}

export default api;
