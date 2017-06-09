// eslint-disable-next-line no-implicit-globals, no-undef
UndoStack = (function() {
'use strict';

function clone(state) {
	return JSON.parse(JSON.stringify(state));
}

// stack is an array of state; undoStack[0] is the initial 'base' state.
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
	this.store.mutations[mutationName](opts);

	if (this.index < this.stack.length - 1) {
		this.stack.splice(this.index + 1);  // If there's undo actions after the 'current' action, delete them
	}
	this.stack.push({
		state: clone(this.store.state),
		text: undoText || ''
	});
	this.index++;
};

UndoStack.prototype.saveBaseState = function() {
	this.stack = [{state: clone(this.store.state), text: null}];
	this.index = 0;
};

UndoStack.prototype.undo = function() {
	this.index--;
	const newState = clone(this.stack[this.index].state);
	this.store.replaceState(newState);
};

UndoStack.prototype.redo = function() {
	this.index++;
	const newState = clone(this.stack[this.index].state);
	this.store.replaceState(newState);
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

return UndoStack;

})();
