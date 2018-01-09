/* global module: false */

// eslint-disable-next-line no-implicit-globals, no-undef
UndoStack = (function() {
'use strict';

function clone(state) {
	return JSON.parse(JSON.stringify(state));
}

// stack is an array of state; undoStack[0] is the initial 'base' state (after model open / import) that cannot be undone.
// index points to the currently visible state in the UI.
function UndoStack(store) {
	if (this instanceof UndoStack) {
		this.stack = [];
		this.index = -1;
		this.store = store;
		return this;
	}
	return new UndoStack(store);
}

UndoStack.prototype.commit = function(mutationName, opts, undoText) {

	if (!this.store || !this.store.mutations || typeof this.store.mutations[mutationName] !== 'function') {
		return;  // Ignore invalid / unrecognized commits
	} else if (this.index < 0) {
		return;  // Do not allow commit without initial base state
	}

	this.store.mutations[mutationName](opts);

	if (this.index < this.stack.length - 1) {
		// If there's undo actions after the 'current' action, delete them
		this.stack.splice(this.index + 1);
	}
	this.stack.push({
		state: clone(this.store.state),
		text: undoText || ''
	});
	this.index++;
};

// Copy the store's current state into the undoStack's initial base state
UndoStack.prototype.saveBaseState = function() {
	this.stack = [{state: clone(this.store.state), text: null}];
	this.index = 0;
};

UndoStack.prototype.undo = function() {
	if (this.isUndoAvailable()) {
		this.index--;
		const newState = clone(this.stack[this.index].state);
		this.store.replaceState(newState);
	}
};

UndoStack.prototype.redo = function() {
	if (this.isRedoAvailable()) {
		this.index++;
		const newState = clone(this.stack[this.index].state);
		this.store.replaceState(newState);
	}
};

UndoStack.prototype.clear = function() {
	this.stack = [];
	this.index = -1;
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

if (typeof module !== 'undefined' && module.exports != null) {
	module.exports = UndoStack;
}

return UndoStack;

})();
