'use strict';

import store from '../store';
import Layout from '../layout';

export default {
	add(opts = {}) {  // opts: {pageNumber, pageType = 'page', insertionIndex = -1}
		const pageSize = store.state.template.page;
		const pageType = opts.pageType || 'page';
		const page = store.mutations.item.add({item: {
			type: pageType,
			steps: [], dividers: [], annotations: [], pliItems: [],
			needsLayout: true, locked: false, stretchedStep: null,
			innerContentOffset: {x: 0, y: 0},
			number: opts.pageNumber,
			numberLabelID: null,
			layout: pageSize.width > pageSize.height ? 'horizontal' : 'vertical'
		}, insertionIndex: opts.insertionIndex});

		if (opts.pageNumber === 'id') {  // Special flag to say 'use page ID as page number'
			page.number = page.id + 1;
		}

		if (opts.pageNumber != null) {
			store.mutations.item.add({item: {
				type: 'numberLabel',
				align: 'right', valign: 'bottom',
				x: null, y: null, width: null, height: null
			}, parent: page});
		}

		if (pageType === 'page') {
			store.mutations.page.renumber();
		}
		return page;
	},
	delete(opts) {  // opts: {page}
		const page = store.get.lookupToItem(opts.page);
		if (page.steps && page.steps.length) {
			throw 'Cannot delete a page with steps';
		}
		if (page.numberLabelID != null) {
			store.mutations.item.delete({item: store.get.numberLabel(page.numberLabelID)});
		}
		store.mutations.item.deleteChildList({item: page, listType: 'divider'});
		store.mutations.item.deleteChildList({item: page, listType: 'annotation'});
		store.mutations.item.delete({item: page});
		store.mutations.page.renumber();
	},
	setLocked(opts) {  // opts: {page, locked}
		const page = store.get.lookupToItem(opts.page);
		if (page) {
			page.locked = opts.locked;
		}
	},
	renumber() {
		store.mutations.renumber(store.state.pages, store.state.titlePage ? 2 : 1);
	},
	layout(opts) {  // opts: {page, layout}, layout = 'horizontal' or 'vertical' or {rows, cols}
		const page = store.get.lookupToItem(opts.page);
		if (!page.locked) {
			Layout.page(page, opts.layout || page.layout);
		}
	}
};
