/* Web Lic - Copyright (C) 2019 Remi Gagne */

/* global JSZip: false, saveAs: false */

import _ from '../util';
import store from '../store';
import Layout from '../layout';
import LDParse from '../ld_parse';
import packageInfo from '../../package.json';

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
	delete() {
	},
	addTitlePage(opts) {  // opts: {book}
		const book = store.get.lookupToItem(opts.book);
		const firstPage = store.get.firstBookPage(book);
		if (firstPage.subtype === 'titlePage') {
			store.mutations.removeTitlePage();
		}
		const titlePage = store.mutations.addTitlePage({book});
		titlePage.parent = {type: 'book', id: book.id};
		book.pages.unshift(titlePage.id);
	},
	setBookPageNumbers(opts) { // opts: {book, firstPageNumber: 'start_page_1' or 'preserve_page_count'}
		const book = store.get.lookupToItem(opts.book);
		if (opts.firstPageNumber === 'start_page_1') {
			const pages = book.pages.map(store.get.page);
			store.mutations.renumber(pages, 1);
		} else {  // vs 'preserve_page_count'
			store.mutations.page.renumber();
		}
	},
	splitFileByBook() {
		// Create a seperate, unique Lic file for each Book in these instructions, then trigger a zip download
		const modelName = store.get.modelFilenameBase();
		const fn = modelName + '_instruction_books';
		const zip = new JSZip();
		const fileFolder = zip.folder(fn);

		function addPartsFromPreviousSteps(book) {
			const visitedModels = new Set();
			book.pages
				.map(store.get.page)
				.map(page => page.steps)
				.flat()
				.map(store.get.step)
				.forEach(step => {
					if (!visitedModels.has(step.model.filename) && step.parts) {
						step.prevBookParts = store.get.partList(step);
						visitedModels.add(step.model.filename);
					}
				});
		}

		function getStateForBook(book) {

			// If this isn't the first book, add parts from all previous books
			// to the first step of each model in this book
			if (book.id !== store.state.books[0].id) {
				addPartsFromPreviousSteps(book);
			}

			// Retrieve the subset of store.state that lives only in the chosen book
			// Start with a clone of the original state, then delete each page,
			// and all children, that are not in this book
			const originalState = _.cloneDeep(store.state);
			const pagesToDelete = store.state.pages.filter(page => {
				return page.parent != null && page.parent.id !== book.id;
			});
			pagesToDelete.forEach(page => {
				store.mutations.page.delete({page, deleteSteps: true, doNotRenumber: true});
			});
			store.state.books = [book];
			return {originalState, newState: store.state};
		}

		const content = {
			partDictionary: LDParse.partDictionary,
			colorTable: LDParse.colorTable,
			modelFilename: store.model.filename,
			version: packageInfo.version
		};
		let firstBookState;
		const books = _.cloneDeep(store.state.books);  // Need to clone because loop hoses state
		books.forEach((book, idx) => {
			book = store.get.lookupToItem(book);
			const res = getStateForBook(book);
			content.state = res.newState;
			if (idx === 0) {
				firstBookState = content.state;
			}
			store.replaceState(res.originalState);
			const json = JSON.stringify(content);
			fileFolder.file(`${modelName}_book_${book.number}.lic`, json);
		});
		zip.generateAsync({type: 'blob'})
			.then(content => saveAs(content, fn + '.zip'));
		store.replaceState(firstBookState);
	},
	divideInstructions(opts) {
		// opts: {bookDivisions, firstPageNumber, includeTitlePages, fileSplit, noSplitSubmodels}
		//  bookDivisions: [{bookNumber: 1, pages: {start, end}, steps: {start, end}}]}
		opts.bookDivisions.forEach(book => {
			store.mutations.book.add(book);
		});
		if (opts.includeTitlePages) {
			opts.bookDivisions.forEach(book => {
				book = store.get.itemByNumber('book', book.bookNumber);
				store.mutations.book.addTitlePage({book});
			});
		}
		opts.bookDivisions.forEach(book => {
			book = store.get.itemByNumber('book', book.bookNumber);
			store.mutations.book.setBookPageNumbers({book, firstPageNumber: opts.firstPageNumber});
		});
		if (opts.fileSplit === 'separate_files') {  // vs 'one_file'
			store.mutations.book.splitFileByBook();
		}
	},
	layout(opts) {  // opts: {book}
		const book = store.get.lookupToItem(opts.book);
		Layout.book(book);
	}
};
