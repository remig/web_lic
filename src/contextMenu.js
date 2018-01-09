/* global Vue: false */

// eslint-disable-next-line no-implicit-globals, no-undef
ContextMenu = (function() {
'use strict';

let undoStack, app, store;

const contextMenu = {
	page: [
		{text: 'Auto Layout (NYI)', cb: () => {}},
		{text: 'Use Vertical Layout (NYI)', cb: () => {}},
		{text: 'Layout By Row and Column (NYI)', cb: () => {}},
		{text: 'separator'},
		{text: 'Prepend Blank Page (NYI)', cb: () => {}},
		{text: 'Append Blank Page (NYI)', cb: () => {}},
		{text: 'separator'},
		{text: 'Hide Step Separators (NYI)', cb: () => {}},
		{text: 'Add Blank Step (NYI)', cb: () => {}},
		{text: 'Add Annotation (NYI)', cb: () => {}},
		{
			text: 'Delete This Blank Page',
			enabled: () => {
				if (app && app.selectedItem && app.selectedItem.type === 'page') {
					const page = store.state.pages[app.selectedItem.id];
					if (page) {
						return page.steps.length < 1;
					}
				}
				return false;
			},
			cb: () => {
				undoStack.commit('deletePage', app.selectedItem.id, 'Delete Page');
				Vue.nextTick(() => app.setCurrentPage(app.selectedItem.id + 1));
			}
		}
	],
	pageNumber: [
		{text: 'Change Page Number (NYI)', cb: () => {}}
	],
	step: [
		{
			text: 'Move Step to Previous Page',
			cb: function() {
				undoStack.commit('moveStepToPreviousPage', app.selectedItem, this.text);
				Vue.nextTick(() => {
					app.clearSelected();
					app.drawCurrentPage();
				});
			}
		},
		{text: 'Move Step to Next Page (NYI)', cb: () => {}},
		{text: 'separator'},
		{
			text: 'Merge Step with Previous Step',
			cb: function() {
				undoStack.commit(
					'mergeSteps',
					{sourceStepID: app.selectedItem.id, destStepID: app.selectedItem.id - 1},
					this.text
				);
				Vue.nextTick(() => {
					app.clearSelected();
					app.drawCurrentPage();
				});
			}
		},
		{text: 'Merge Step with Next Step (NYI)', cb: () => {}}
	],
	stepNumber: [
		{text: 'Change Step Number (NYI)', cb: () => {}}
	],
	csi: [
		{text: 'Rotate CSI (NYI)', cb: () => {}},
		{text: 'Scale CSI (NYI)', cb: () => {}},
		{text: 'separator'},
		{text: 'Select Part (NYI)', cb: () => {}},
		{text: 'Add New Part (NYI)', cb: () => {}}
	],
	pli: [],
	pliItem: [
		{text: 'Rotate PLI Part (NYI)', cb: () => {}},
		{text: 'Scale PLI Part (NYI)', cb: () => {}}
	]
};

return function(menuEntry, localApp, localStore, localUndoStack) {
	app = localApp;
	store = localStore;
	undoStack = localUndoStack;
	return contextMenu[menuEntry];
};

})();
