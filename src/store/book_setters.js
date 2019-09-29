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
			pages: [],
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
	addTitlePage(opts) {  // opts: {book}
		const book = store.get.lookupToItem(opts.book);
		const firstPage = store.get.firstBookPage(book);
		if (firstPage.subtype !== 'titlePage') {
			const titlePage = store.mutations.addTitlePage({book});
			titlePage.parent = {type: 'book', id: book.id};
			book.pages.unshift(titlePage.id);
		}
	},
	divideInstructions(opts) {  // opts: {bookDivisions, firstPageNumber, includeTitlePages, fileSplit}
		//  bookDivisions: [{bookNumber: 1, pages: {start, end}, steps: {start, end}}]}
		opts.bookDivisions.forEach(book => {
			book = store.mutations.book.add(book);
			if (opts.includeTitlePages) {
				store.mutations.book.addTitlePage({book});
			}
		});
	},
	layout(opts) {  // opts: {book}
		const book = store.get.lookupToItem(opts.book);
		Layout.book(book);
	}
};
