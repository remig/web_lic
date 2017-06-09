/* global Vue: false */

// eslint-disable-next-line no-implicit-globals, no-undef
ContextMenu = (function() {
'use strict';

let undoStack, app, store;

const contextMenu = {
	page: [
		{text: 'Auto Layout', cb: () => {}},
		{text: 'Use Vertical Layout', cb: () => {}},
		{text: 'Layout By Row and Column', cb: () => {}},
		{text: 'separator'},
		{text: 'Prepend Blank Page', cb: () => {}},
		{text: 'Append Blank Page', cb: () => {}},
		{text: 'separator'},
		{text: 'Hide Step Separators', cb: () => {}},
		{text: 'Add Blank Step', cb: () => {}},
		{text: 'Add Annotation', cb: () => {}},
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
		{text: 'Change Page Number', cb: () => {}}
	],
	step: [
		{text: 'Move Step to Previous Page', cb: () => {
			undoStack.commit('moveStepToPreviousPage', app.selectedItem, 'Move Step to Page');
			Vue.nextTick(() => {
				app.clearSelected();
				app.drawCurrentPage();
			});
		}},
		{text: 'Move Step to Next Page', cb: () => {}},
		{text: 'separator'},
		{text: 'Merge Step with Previous Step', cb: () => {}},
		{text: 'Merge Step with Next Step', cb: () => {}}
	],
	stepNumber: [
		{text: 'Change Step Number', cb: () => {}}
	],
	csi: [
		{text: 'Rotate CSI', cb: () => {}},
		{text: 'Scale CSI', cb: () => {}},
		{text: 'separator'},
		{text: 'Select Part', cb: () => {}},
		{text: 'Add New Part', cb: () => {}}
	],
	pli: [],
	pliItem: [
		{text: 'Rotate PLI Part', cb: () => {}},
		{text: 'Scale PLI Part', cb: () => {}}
	]
};

return function(menuEntry, localApp, localStore, localUndoStack) {
	app = localApp;
	store = localStore;
	undoStack = localUndoStack;
	return contextMenu[menuEntry];
};

})();
