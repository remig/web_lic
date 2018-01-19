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
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'page') {
					const page = store.get.lookupToItem(app.selectedItemLookup);
					return page.steps.length < 1;
				}
				return false;
			},
			cb: () => {
				const nextPage = store.get.nextPage(app.selectedItemLookup) || store.get.lastPage();
				undoStack.commit('deletePage', app.selectedItemLookup.id, 'Delete Page');
				Vue.nextTick(() => {
					app.setCurrentPage(nextPage);
				});
			}
		}
	],
	pageNumber: [
		{text: 'Change Page Number (NYI)', cb: () => {}}
	],
	step: [
		{
			text: 'Move Step to Previous Page',
			enabled: () => {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'step') {
					const page = store.get.pageForItem(app.selectedItemLookup);
					if (store.get.isFirstPage(page) || store.get.isTitlePage(page)) {
						return false;  // Previous page doesn't exist
					} else if (page.steps.indexOf(app.selectedItemLookup.id) !== 0) {
						return false;  // Can only move first step on a page to the previous page
					}
					return true;
				}
				return false;
			},
			cb: function() {
				const step = store.get.lookupToItem(app.selectedItemLookup);
				undoStack.commit('moveStepToPreviousPage', step, this.text);
				Vue.nextTick(() => {
					app.clearSelected();
					app.drawCurrentPage();
				});
			}
		},
		{
			text: 'Move Step to Next Page',
			enabled: () => {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'step') {
					const page = store.get.pageForItem(app.selectedItemLookup);
					if (store.get.isLastPage(page)) {
						return false;  // Previous page doesn't exist
					} else if (page.steps.indexOf(app.selectedItemLookup.id) !== page.steps.length - 1) {
						return false;  // Can only move last step on a page to the next page
					}
					return true;
				}
				return false;
			},
			cb: function() {
				const step = store.get.lookupToItem(app.selectedItemLookup);
				undoStack.commit('moveStepToNextPage', step, this.text);
				Vue.nextTick(() => {
					app.clearSelected();
					app.drawCurrentPage();
				});
			}
		},
		{text: 'separator'},
		{
			text: 'Merge Step with Previous Step',
			enabled: () => {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'step') {
					const step = store.get.lookupToItem(app.selectedItemLookup);
					return store.state.steps.indexOf(step) > 1;  // First 'step' is the title page content, which can't be merged
				}
				return false;
			},
			cb: function() {
				undoStack.commit(
					'mergeSteps',
					{sourceStepID: app.selectedItemLookup.id, destStepID: app.selectedItemLookup.id - 1},
					this.text
				);
				Vue.nextTick(() => {
					app.clearSelected();
					app.drawCurrentPage();
				});
			}
		},
		{
			text: 'Merge Step with Next Step',
			enabled: () => {
				if (app && app.selectedItemLookup && app.selectedItemLookup.type === 'step') {
					const step = store.get.lookupToItem(app.selectedItemLookup);
					return store.state.steps.indexOf(step) < store.state.steps.length - 1;
				}
				return false;
			},
			cb: function() {
				undoStack.commit(
					'mergeSteps',
					{sourceStepID: app.selectedItemLookup.id, destStepID: app.selectedItemLookup.id + 1},
					this.text
				);
				Vue.nextTick(() => {
					app.clearSelected();
					app.drawCurrentPage();
				});
			}
		}
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
	],
	label: [
		{
			text: 'Set...',
			children: [
				{text: 'Text (NYI)', cb: () => {}},
				{text: 'Font (NYI)', cb: () => {}},
				{text: 'Color (NYI)', cb: () => {}}
			]
		}
	]
};

return function(menuEntry, localApp, localStore, localUndoStack) {
	app = localApp;
	store = localStore;
	undoStack = localUndoStack;
	return contextMenu[menuEntry];
};

})();
