/* Web Lic - Copyright (C) 2019 Remi Gagne */

import store from '../store';
import {tr} from '../translations';
import LDParse from '../ld_parse';

function addOneTitlePage(parent?: Book) {
	let insertionIndex = 1;
	if (parent) {
		insertionIndex = store.state.pages.findIndex(
			(page: Page) => page.id === parent.pages[0]
		);
	}
	const page = store.mutations.page.add({
		subtype: 'titlePage',
		parent,
		insertionIndex,
		parentInsertionIndex: 0,
		doNotRenumber: true,
	});
	page.number = 1;
	if (parent) {
		const tmpPage = store.get.page(parent.pages[1]);
		if (tmpPage == null) {
			throw 'Trying to get a Book Page number from a non-existent Page';
		}
		page.number = tmpPage.number;
	}
	store.mutations.page.renumber();

	const step = store.mutations.step.add({dest: page});
	if (store && store.model && store.model.filename) {
		step.model.filename = store.model.filename;
	}

	store.mutations.titlePage.addTitleLabel(page);

	store.mutations.titlePage.addPageCountLabel(page);
}

export interface TitlePageMutationInterface {
	add(): void;
	delete(): void;
	addTitleLabel(page: Page): Annotation;
	addPageCountLabel(page: Page, parent?: Book): Annotation;
}

export const TitlePageMutations: TitlePageMutationInterface = {

	add() {
		if (store.state.books.length > 1) {
			store.state.books.forEach(addOneTitlePage);
		} else {
			addOneTitlePage();
		}
	},
	delete() {
		store.state.pages
			.map(store.get.page)
			.filter((page): page is Page => page != null && page.subtype === 'titlePage')
			.forEach((page: Page) => {
				store.mutations.item.deleteChildList({item: page, listType: 'step'});
				store.mutations.page.delete({page});
			});
	},
	addTitleLabel(page: Page) {
		return store.mutations.annotation.add({
			annotationType: 'label',
			properties: {
				text: store.get.modelName(true),
				font: '20pt Helvetica',
				meta: {
					type: 'title-page-model-name',
				},
			},
			parent: page, x: 0, y: 0,
		});
	},
	addPageCountLabel(page: Page, parent?: Book) {

		// TODO: This part & page count gets out of sync with the doc as pages are added / removed
		const partCount = LDParse.model.get.partCount(store.model);
		const pageCount = store.get.pageCount();  // TODO: count only pages in the current book
		let text;
		if (parent) {
			const parentBook = store.get.book(parent);
			if (parentBook == null) {
				throw 'Trying to find a nice annotation for a non-existent Book';
			}
			const bookNumber = parentBook.number;
			text = tr('title_page.book_model_info_@mf', {bookNumber, partCount, pageCount});
		} else {
			text = tr('title_page.model_info_@mf', {partCount, pageCount});
		}

		return store.mutations.annotation.add({
			annotationType: 'label',
			properties: {
				text,
				font: '16pt Helvetica',
				meta: {
					type: 'title-page-page-count',
				},
			},
			parent: page, x: 0, y: 0,
		});
	},
};
