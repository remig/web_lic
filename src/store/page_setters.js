/* Web Lic - Copyright (C) 2019 Remi Gagne */

import store from '../store';
import Layout from '../layout';

export default {
	// opts: {pageNumber, subtype = 'page', doNotRenumber: false,
	// parent = null, insertionIndex = -1, parentInsertionIndex = null}
	add(opts = {}) {
		const pageSize = store.state.template.page;
		const page = store.mutations.item.add({
			item: {
				type: 'page',
				subtype: opts.subtype || 'page',
				steps: [], dividers: [], annotations: [], pliItems: [],
				needsLayout: true, locked: false, stretchedStep: null,
				innerContentOffset: {x: 0, y: 0},
				number: opts.pageNumber,
				numberLabelID: null,
				layout: pageSize.width > pageSize.height ? 'horizontal' : 'vertical'
			},
			parent: opts.parent,
			insertionIndex: opts.insertionIndex,
			parentInsertionIndex: opts.parentInsertionIndex
		});

		if (opts.pageNumber === 'id') {  // Special flag to say 'use page ID as page number'
			page.number = page.id;
		}

		if (opts.pageNumber != null) {
			store.mutations.item.add({item: {
				type: 'numberLabel',
				align: 'right', valign: 'bottom',
				x: null, y: null, width: null, height: null
			}, parent: page});
		}

		if (!opts.doNotRenumber) {
			store.mutations.page.renumber();
		}
		return page;
	},
	delete(opts) {  // opts: {page, doNotRenumber: false, deleteSteps: false}
		const page = store.get.lookupToItem(opts.page);
		if (page.steps && page.steps.length) {
			if (opts.deleteSteps) {
				while (page.steps.length) {
					store.mutations.step.delete({
						step: {type: 'step', id: page.steps[0]},
						doNotRenumber: opts.doNotRenumber,
						deleteParts: true
					});
				}
			} else {
				throw 'Cannot delete a page with steps';
			}
		}
		if (page.numberLabelID != null) {
			store.mutations.item.delete({item: store.get.numberLabel(page.numberLabelID)});
		}
		store.mutations.item.deleteChildList({item: page, listType: 'divider'});
		store.mutations.item.deleteChildList({item: page, listType: 'annotation'});
		store.mutations.item.delete({item: page});
		if (!opts.doNotRenumber) {
			store.mutations.page.renumber();
		}
	},
	setLocked(opts) {  // opts: {page, locked}
		const page = store.get.lookupToItem(opts.page);
		if (page) {
			page.locked = opts.locked;
		}
	},
	renumber() {
		if (store.state.books.length) {
			store.state.books.forEach(book => {
				// TODO: need to store whether books start from 1 or preserve numbering
				const pages = book.pages.map(store.get.page);
				store.mutations.renumber(pages, 1);
			});
		} else {
			store.mutations.renumber(store.state.pages, 0);
		}
	},
	markAllDirty() {
		store.state.pages.forEach(page => (page.needsLayout = true));
	},
	layout(opts) {  // opts: {page, layout}, layout = 'horizontal' or 'vertical' or {rows, cols}
		const page = store.get.lookupToItem(opts.page);
		if (!page.locked) {
			Layout.page(page, opts.layout || page.layout);
		}
	}
};
