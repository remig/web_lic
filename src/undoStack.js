'use strict';

const util = require('./util');

// stack is an array of state; undoStack[0] is the initial 'base' state (after model open / import) that cannot be undone.
// index points to the currently visible state in the UI.
// TODO: don't let this grow unbound - support max undo stack size.  Need performance metrics here, for decent max stack size.
function UndoStack(store) {
	if (this instanceof UndoStack) {
		this.stack = [];
		this.index = -1;
		this.store = store;
		this.localStorageTimer = null;
		this.onChangeCB = null;
		return this;
	}
	return new UndoStack(store);
}

function clone(state) {
	return JSON.parse(JSON.stringify(state));
}

UndoStack.prototype.onChange = function(onChangeCB) {
	this.onChangeCB = onChangeCB;
};

UndoStack.prototype.commit = function(mutationName, opts, undoText) {

	util.get(mutationName, this.store.mutations)(opts);  // Perform the actual action

	if (this.index < this.stack.length - 1) {
		// If there's undo actions after the 'current' action, delete them
		this.stack.splice(this.index + 1);
	}
	this.stack.push({
		state: clone(this.store.state),
		text: undoText || ''
	});
	setIndex(this, this.index + 1);

	// Save the current state to localStorage if we haven't saved it in the last 30 seconds
	// Need 'typeof setTimeout' check to not crash in unit tests
	if (typeof setTimeout === 'function' && this.localStorageTimer == null) {
		this.store.save('localStorage');
		this.localStorageTimer = setTimeout(() => {
			this.localStorageTimer = null;
		}, 30 * 1000);
	}
};

function setIndex(stack, newIndex) {
	stack.index = newIndex;
	if (stack.onChangeCB) {
		stack.onChangeCB();
	}
}

// Copy the store's current state into the undoStack's initial base state
UndoStack.prototype.saveBaseState = function() {
	this.stack = [{state: clone(this.store.state), text: null}];
	setIndex(this, 0);
};

UndoStack.prototype.undo = function() {
	if (this.isUndoAvailable()) {
		setIndex(this, this.index - 1);
		const newState = clone(this.stack[this.index].state);
		this.store.replaceState(newState);
	}
};

UndoStack.prototype.redo = function() {
	if (this.isRedoAvailable()) {
		setIndex(this, this.index + 1);
		const newState = clone(this.stack[this.index].state);
		this.store.replaceState(newState);
	}
};

UndoStack.prototype.clear = function() {
	this.stack = [];
	setIndex(this, -1);
};

UndoStack.prototype.isUndoAvailable = function() {
	return this.index > 0;
};

UndoStack.prototype.isRedoAvailable = function() {
	return this.index < this.stack.length - 1;
};

UndoStack.prototype.undoText = function() {
	return this.isUndoAvailable() ? this.stack[this.index].text : '';
};

UndoStack.prototype.redoText = function() {
	return this.isRedoAvailable() ? this.stack[this.index + 1].text : '';
};

module.exports = UndoStack;
