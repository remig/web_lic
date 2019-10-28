/* eslint-disable max-len */
import page from '../page_api';

describe('Test multi book ', () => {

	beforeEach(() => {
		cy.clearLocalStorage().then(() => {
			localStorage.clear();  // Need this because we overwrote cy.clearLocalStorage() to do nothing
		});
		cy.visit('http://localhost:8080');
		cy.get(page.ids.dialog.whatsNew + ' .el-button').click();
		cy.get(page.ids.dialog.localeChooser.container + ' .el-button').click();
	});

	it('Import Alligator and Split it', () => {
		cy.getByTestId('import-alligator').click();
		cy.getByTestId('import-use-max-steps').find('input').should('be.checked');
		cy.getByTestId('import-use-max-steps').click();
		cy.getByTestId('import-include-dropdown').click();
		cy.getByTestId('include-titlePage').find('i').should('exist');
		cy.getByTestId('include-titlePage').click();
		cy.getByTestId('import-ok').click();
		cy.get('#edit_menu').click();
		cy.get('#multi_book_menu').click();
		cy.getByTestId('multi-book-title-pages').should('have.class', 'is-checked');
		cy.getByTestId('multi-book-title-pages').click();
		cy.getByTestId('multi-book-ok').click();

		cy.window().its('__lic.store.state').then((state) => {
			assert.strictEqual(state.pages.length, 43, 'Page count is correct');
			assert.deepEqual(
				state.pages.map(p => p.number),
				[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
				'Page Numbers are correct'
			);
			assert.equal(state.pages.filter(p => p.subtype === 'titlePage').length, 0, 'No title pages');
		});

		cy.get('#nav-tree > ul').children().should('have.length', 3);
		cy.get('#treeParent_book_0').should('exist');
		cy.get('#treeParent_book_0').click();
		cy.get('#treeParent_book_0 > .treeChildren').children().should('have.length', 18);

		cy.get('#treeParent_book_1').should('exist');
		cy.get('#treeParent_book_1').click();
		cy.get('#treeParent_book_1 > .treeChildren').children().should('have.length', 24);

		// Now add title pages
		cy.get('#edit_menu').click();
		cy.get('#add_title_page_menu').click();

		cy.window().its('__lic').then((lic) => {
			const state = lic.store.state;
			assert.strictEqual(state.pages.length, 45, 'Page count is correct');
			assert.deepEqual(
				state.pages.map(p => p.number),
				[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
				'Page Numbers are correct'
			);
			assert.equal(state.pages.filter(p => p.subtype === 'titlePage').length, 2, 'Two title pages');
			assert.equal(lic.app.currentPageLookup.id, 43, 'Selected page is the first title page');
			const firstPage = lic.store.get.page(lic.app.currentPageLookup.id);
			assert.equal(firstPage.subtype, 'titlePage');
			assert.equal(firstPage.number, 1);
		});

		cy.get('#nav-tree > ul').children().should('have.length', 3);
		cy.get('#treeParent_book_0 > .treeChildren').children().should('have.length', 19);
		cy.get('#treeParent_book_1 > .treeChildren').children().should('have.length', 25);

		// Now remove title pages
		cy.get('#edit_menu').click();
		cy.get('#remove_title_page_menu').click();

		cy.window().its('__lic').then((lic) => {
			const state = lic.store.state;
			assert.strictEqual(state.pages.length, 43, 'Page count is correct');
			assert.deepEqual(
				state.pages.map(p => p.number),
				[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
				'Page Numbers are correct'
			);
			assert.equal(state.pages.filter(p => p.subtype === 'titlePage').length, 0, 'Zero title pages');
			assert.equal(lic.app.currentPageLookup.id, 1, 'Selected page is the first page');
			const firstPage = lic.store.get.page(lic.app.currentPageLookup.id);
			assert.equal(firstPage.subtype, 'page');
			assert.equal(firstPage.number, 1);
		});

		cy.get('#nav-tree > ul').children().should('have.length', 3);
		cy.get('#treeParent_book_0 > .treeChildren').children().should('have.length', 18);
		cy.get('#treeParent_book_1 > .treeChildren').children().should('have.length', 24);
	});
});
