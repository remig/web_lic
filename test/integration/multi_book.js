/* eslint-disable no-unused-expressions */
import page from '../page_api';

describe('Test multi book ', () => {

	before(() => {
		cy.clearLocalStorage().then(() => {
			localStorage.clear();  // Need this because we overwrote cy.clearLocalStorage() to do nothing
		});
		cy.visit('http://localhost:8080');
	});

	it('Import Alligator and Split it', () => {
		cy.get(page.ids.dialog.whatsNew + ' .el-button').click();
		cy.get(page.ids.dialog.localeChooser.container + ' .el-button').click();
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
	});
});
