/* Web Lic - Copyright (C) 2019 Remi Gagne */

import _ from '../util';
import store from '../store';
import uiState from '../ui_state';
import Layout from '../layout';

export default {
	// opts: {pageNumber, subtype = 'page', doNotRenumber: false,
	// parent = null, insertionIndex = -1, parentInsertionIndex = null}
	add({
		pageNumber, subtype = 'page', doNotRenumber = false,
		parent = null, insertionIndex = -1, parentInsertionIndex = null,
	}) {
		const pageSize = store.state.template.page;
		const page = store.mutations.item.add({
			item: {
				type: 'page',
				subtype: subtype,
				steps: [], dividers: [], annotations: [], pliItems: [],
				needsLayout: true, locked: false, stretchedStep: null,
				innerContentOffset: {x: 0, y: 0},
				number: pageNumber,
				numberLabelID: null,
				layout: pageSize.width > pageSize.height ? 'horizontal' : 'vertical',
			},
			parent,
			insertionIndex,
			parentInsertionIndex,
		});

		if (pageNumber === 'id') {  // Special flag to say 'use page ID as page number'
			page.number = page.id;
		}

		if (pageNumber != null) {
			store.mutations.item.add({item: {
				type: 'numberLabel',
				align: 'right', valign: 'bottom',
				x: null, y: null, width: null, height: null,
			}, parent: page});
		}

		if (!doNotRenumber) {
			store.mutations.page.renumber();
		}
		return page;
	},
	delete({page, doNotRenumber = false, deleteSteps = false}) {
		const item = store.get.page(page);
		if (item.steps && item.steps.length) {
			if (deleteSteps) {
				while (item.steps.length) {
					store.mutations.step.delete({
						step: {type: 'step', id: item.steps[0]},
						doNotRenumber,
						deleteParts: true,
					});
				}
			} else {
				throw 'Cannot delete a page with steps';
			}
		}
		if (item.numberLabelID != null) {
			store.mutations.item.delete({item: store.get.numberLabel(item.numberLabelID)});
		}
		store.mutations.item.deleteChildList({item, listType: 'divider'});
		store.mutations.item.deleteChildList({item, listType: 'annotation'});
		store.mutations.item.delete({item});
		if (!doNotRenumber) {
			store.mutations.page.renumber();
		}
	},
	setLocked({page, locked}) {
		const item = store.get.page(page);
		if (item) {
			item.locked = locked;
		}
	},
	renumber() {
		if (store.state.books.length) {
			const firstPageNumber = uiState.get('dialog.multiBook.firstPageNumber');
			store.state.books.forEach(book => {
				const pages = book.pages.map(store.get.page);
				if (firstPageNumber === 'start_page_1') {
					store.mutations.renumber(pages, 1);
				} else if (firstPageNumber === 'preserve_page_count') {
					const prevBook = store.get.prev(book);
					if (prevBook) {
						const lastPageNumber = store.get.page(_.last(prevBook.pages)).number;
						store.mutations.renumber(pages, lastPageNumber + 1);
					} else {
						store.mutations.renumber(pages, 1);
					}
				}
			});
		} else {
			store.mutations.renumber(store.state.pages, 0);
		}
	},
	markAllDirty() {
		store.state.pages.forEach(page => (page.needsLayout = true));
	},
	layout({page, layout}) {  // layout = 'horizontal' or 'vertical' or {rows, cols}
		const item = store.get.page(page);
		if (!item.locked) {
			Layout.page(item, layout || item.layout);
		}
	},
};
