/* eslint-disable max-len, no-unreachable */
import page from '../page_api';
import JSZip from 'jszip';

describe('Test multi book ', () => {

	function importAlligator(excludeTitlePage) {
		cy.getByTestId('import-alligator').click();
		cy.getByTestId('import-use-max-steps').find('input').should('be.checked');
		cy.getByTestId('import-use-max-steps').click();
		if (excludeTitlePage) {
			cy.getByTestId('import-include-dropdown').click();
			cy.getByTestId('include-titlePage').find('i').should('exist');
			cy.getByTestId('include-titlePage').click();
		}
		cy.getByTestId('import-ok').click();
		cy.spy();
	}

	function localSaveAs(blob, filename) {
		assert.strictEqual(filename, '20015 - Alligator_instruction_books.zip');
		JSZip.loadAsync(blob)
			.then(zip => {
				const folderName = filename.split('.')[0] + '/';
				const fileBaseName = folderName + '20015 - Alligator_book_';
				assert.strictEqual(folderName, '20015 - Alligator_instruction_books/');
				assert.property(zip.files, folderName);
				assert.property(zip.files, fileBaseName + '1.lic');
				assert.property(zip.files, fileBaseName + '2.lic');

				zip.files[fileBaseName + '1.lic'].async('string')
					.then(content => {
						const file = JSON.parse(content);
						assert.equal(file.state.books.length, 1);
						assert.deepEqual(
							file.state.books[0].pages,
							file.state.pages.map(p => p.id).slice(1)
						);
					});
			});
	}

	beforeEach(() => {
		cy.clearLocalStorage();
		cy.visit('http://localhost:8080');
		cy.get(page.ids.dialog.whatsNew + ' .el-button').click();
		cy.get(page.ids.dialog.localeChooser.container + ' .el-button').click();
		cy.window().then(win => {
			win.__lic.app.disableLocalStorage = true;
			cy.stub(win, 'saveAs', localSaveAs);
		});
	});

	it('Multi-book dialog shows up with correct defaults', () => {
		importAlligator();

		cy.get('#edit_menu').click();
		cy.get('#multi_book_menu').click();
		cy.get('.multiBookDialog').should('exist').should('be.visible');
		cy.getByTestId('multi-book-book-count').should('have.value', '2');
		cy.get('.book-split-table').within(() => {
			cy.get('tr').should('have.length', 3);
			cy.get('tr:first').find('th').should('have.length', 2);
		});
		cy.getByTestId('multi-book-title-pages', ' input').should('be.checked');
		cy.getByTestId('multi-book-no-split-submodels', ' input').should('be.checked');
		cy.getByTestId('multi-book-page-start-1', ' input').should('be.checked');
		cy.getByTestId('multi-book-page-start-old', ' input').should('not.be.checked');
		cy.getByTestId('multi-book-one-lic-file', ' input').should('be.checked');
		cy.getByTestId('multi-book-many-lic-files', ' input').should('not.be.checked');
	});

	it('Split Alligator with default Multi-book settings', () => {

		importAlligator();

		// Split into multiple books with default multi-book settings
		cy.get('#edit_menu').click();
		cy.get('#multi_book_menu').click();
		cy.getByTestId('multi-book-ok').click();

		cy.window().its('__lic.store.state').then((state) => {
			assert.strictEqual(state.pages.length, 45, 'Page count is correct');
			assert.deepEqual(
				state.pages.map(p => p.number),
				[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
				'Page Numbers are correct'
			);
			assert.equal(state.pages.filter(p => p.subtype === 'titlePage').length, 2, 'Have 2 title pages');
		});

		cy.get('#nav-tree > ul').children().should('have.length', 3);
		cy.get('#treeParent_book_0').should('exist');
		cy.get('#treeParent_book_0').click();
		cy.get('#treeParent_book_0 > .treeChildren').children().should('have.length', 19);

		cy.get('#treeParent_book_1').should('exist');
		cy.get('#treeParent_book_1').click();
		cy.get('#treeParent_book_1 > .treeChildren').children().should('have.length', 25);
	});

	it('Split Alligator with no title pages', () => {

		importAlligator(true);

		// Split into multiple books without title pages
		cy.get('#edit_menu').click();
		cy.get('#multi_book_menu').click();
		cy.getByTestId('multi-book-title-pages', ' input').should('be.checked');
		cy.getByTestId('multi-book-title-pages').click();
		cy.getByTestId('multi-book-ok').click();

		// Verify state
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

	it('Split Alligator preserve page numbers', () => {

		importAlligator(true);

		// Split into multiple books and preserves page numbers
		cy.get('#edit_menu').click();
		cy.get('#multi_book_menu').click();
		cy.getByTestId('multi-book-title-pages', ' input').should('be.checked');
		cy.getByTestId('multi-book-title-pages').click();
		cy.getByTestId('multi-book-page-start-old', ' input').should('not.be.checked');
		cy.getByTestId('multi-book-page-start-old').click();
		cy.getByTestId('multi-book-ok').click();

		// Verify state
		cy.window().its('__lic.store.state').then((state) => {
			assert.strictEqual(state.pages.length, 43, 'Page count is correct');
			assert.deepEqual(
				state.pages.map(p => p.number),
				[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42],
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
				[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44],
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
	});

	it('Split Alligator into separate files', () => {

		importAlligator();

		// Split into multiple books with default multi-book settings
		cy.get('#edit_menu').click();
		cy.get('#multi_book_menu').click();
		cy.getByTestId('multi-book-many-lic-files', ' input').should('not.be.checked');
		cy.getByTestId('multi-book-many-lic-files').click();
		cy.getByTestId('multi-book-ok').click();

		cy.window().its('__lic.store.state').then((state) => {
			assert.strictEqual(state.pages.length, 20, 'Page count is correct');
			assert.deepEqual(
				state.pages.map(p => p.number),
				[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
				'Page Numbers are correct'
			);
			assert.equal(state.pages.filter(p => p.subtype === 'titlePage').length, 1, 'Have 1 title page');
		});

		cy.get('#nav-tree > ul').children().should('have.length', 2);
		cy.get('#treeParent_book_0').should('exist');
		cy.get('#treeParent_book_0').click();
		cy.get('#treeParent_book_0 > .treeChildren').children().should('have.length', 19);
		cy.get('#treeParent_book_1').should('not.exist');
	});
});
