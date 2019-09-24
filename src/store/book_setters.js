/* Web Lic - Copyright (C) 2019 Remi Gagne */

import _ from '../util';
import store from '../store';
import Layout from '../layout';

export default {
	add(opts = {}) {  // opts: {bookNumber, pages: {start, end}}
		const pageNumbers = _.range(opts.pages.start, opts.pages.end + 1);
		const pages = pageNumbers.map(pageNumber => {
			return store.get.itemByNumber('page', pageNumber);
		});
		const book = store.mutations.item.add({item: {
			type: 'book',
			pages: pages.map(page => ({type: page.type, id: page.id})),
			number: opts.bookNumber
		}});
		pages.map(page => {
			page.parent = {};
			store.mutations.item.reparent({
				item: page,
				newParent: book
			});
		});
		return book;
	},
	delete(opts) {  // opts: {book}
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
	divideInstructions(opts) {  // opts: {bookDivisions}
		//  bookDivisions: [{bookNumber: 1, pages: {start, end}, steps: {start, end}}]}
		opts.bookDivisions.forEach(store.mutations.book.add);
	},
	layout(opts) {  // opts: {book}
		const book = store.get.lookupToItem(opts.book);
		Layout.book(book);
	}
};
