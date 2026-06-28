import { expect, test } from '@playwright/test';

import { getCapturedZip, importAlligator, reloadLicPage } from '../support/helpers';

test.describe('Test multi book', () => {
	test.beforeEach(async ({ page }) => {
		await reloadLicPage(page);
	});

	test('Multi-book dialog shows up with correct defaults', async ({ page }) => {
		await importAlligator(page, { use1Step: true });

		await page.locator('#edit_menu').click();
		await page.locator('#multi_book_menu').click();

		await expect(page.locator('.multiBookDialog')).toBeVisible();
		await expect(page.getByTestId('multi-book-book-count')).toHaveValue('2');
		const rows = page.locator('.book-split-table tr');
		await expect(rows).toHaveCount(3);
		await expect(rows.first().locator('th')).toHaveCount(2);

		await expect(page.getByTestId('multi-book-title-pages').locator('input')).toBeChecked();
		await expect(page.getByTestId('multi-book-no-split-submodels').locator('input')).toBeChecked();
		await expect(page.getByTestId('multi-book-page-start-1').locator('input')).toBeChecked();
		await expect(page.getByTestId('multi-book-page-start-old').locator('input')).not.toBeChecked();
		await expect(page.getByTestId('multi-book-one-lic-file').locator('input')).toBeChecked();
		await expect(page.getByTestId('multi-book-many-lic-files').locator('input')).not.toBeChecked();
	});

	test('Split Alligator with default Multi-book settings', async ({ page }) => {
		await importAlligator(page, { use1Step: true });

		await page.locator('#edit_menu').click();
		await page.locator('#multi_book_menu').click();
		await page.getByTestId('multi-book-ok').click();

		const state = await page.evaluate(() => {
			const { state } = (window as any).__lic.store;
			return {
				pagesLength: state.pages.length,
				pageNumbers: state.pages.map((p: any) => p.number),
				titlePageCount: state.pages.filter((p: any) => p.subtype === 'titlePage').length,
			};
		});
		expect(state.pagesLength).toBe(45);
		expect(state.pageNumbers).toEqual([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]);
		expect(state.titlePageCount).toBe(2);

		await expect(page.locator('#nav-tree > ul').locator('> *')).toHaveCount(3);
		await page.locator('#treeParent_book_0').click();
		await expect(page.locator('#treeParent_book_0 > .treeChildren').locator('> *')).toHaveCount(19);
		await page.locator('#treeParent_book_1').click();
		await expect(page.locator('#treeParent_book_1 > .treeChildren').locator('> *')).toHaveCount(25);
	});

	test('Split Alligator with no title pages', async ({ page }) => {
		await importAlligator(page, { excludeTitlePage: true, use1Step: true });

		await page.locator('#edit_menu').click();
		await page.locator('#multi_book_menu').click();
		await expect(page.getByTestId('multi-book-title-pages').locator('input')).toBeChecked();
		await page.getByTestId('multi-book-title-pages').click();
		await page.getByTestId('multi-book-ok').click();

		const state1 = await page.evaluate(() => {
			const { state } = (window as any).__lic.store;
			return {
				pagesLength: state.pages.length,
				pageNumbers: state.pages.map((p: any) => p.number),
				titlePageCount: state.pages.filter((p: any) => p.subtype === 'titlePage').length,
			};
		});
		expect(state1.pagesLength).toBe(43);
		expect(state1.pageNumbers).toEqual([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]);
		expect(state1.titlePageCount).toBe(0);

		await expect(page.locator('#nav-tree > ul').locator('> *')).toHaveCount(3);
		await page.locator('#treeParent_book_0').click();
		await expect(page.locator('#treeParent_book_0 > .treeChildren').locator('> *')).toHaveCount(18);
		await page.locator('#treeParent_book_1').click();
		await expect(page.locator('#treeParent_book_1 > .treeChildren').locator('> *')).toHaveCount(24);

		// Add title pages
		await page.locator('#edit_menu').click();
		await page.locator('#add_title_page_menu').click();

		const state2 = await page.evaluate(() => {
			const lic = (window as any).__lic;
			const { state } = lic.store;
			return {
				pagesLength: state.pages.length,
				pageNumbers: state.pages.map((p: any) => p.number),
				titlePageCount: state.pages.filter((p: any) => p.subtype === 'titlePage').length,
				currentPageId: lic.app.currentPageId,
				firstPageSubtype: lic.store.get.page(lic.app.currentPageId)?.subtype,
				firstPageNumber: lic.store.get.page(lic.app.currentPageId)?.number,
			};
		});
		expect(state2.pagesLength).toBe(45);
		expect(state2.pageNumbers).toEqual([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]);
		expect(state2.titlePageCount).toBe(2);
		expect(state2.currentPageId).toBe(43);
		expect(state2.firstPageSubtype).toBe('titlePage');
		expect(state2.firstPageNumber).toBe(1);

		await expect(page.locator('#treeParent_book_0 > .treeChildren').locator('> *')).toHaveCount(19);
		await expect(page.locator('#treeParent_book_1 > .treeChildren').locator('> *')).toHaveCount(25);

		// Remove title pages
		await page.locator('#edit_menu').click();
		await page.locator('#remove_title_page_menu').click();

		const state3 = await page.evaluate(() => {
			const lic = (window as any).__lic;
			const { state } = lic.store;
			return {
				pagesLength: state.pages.length,
				pageNumbers: state.pages.map((p: any) => p.number),
				titlePageCount: state.pages.filter((p: any) => p.subtype === 'titlePage').length,
				currentPageId: lic.app.currentPageId,
				firstPageSubtype: lic.store.get.page(lic.app.currentPageId)?.subtype,
				firstPageNumber: lic.store.get.page(lic.app.currentPageId)?.number,
			};
		});
		expect(state3.pagesLength).toBe(43);
		expect(state3.pageNumbers).toEqual([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]);
		expect(state3.titlePageCount).toBe(0);
		expect(state3.currentPageId).toBe(1);
		expect(state3.firstPageSubtype).toBe('page');
		expect(state3.firstPageNumber).toBe(1);

		await expect(page.locator('#treeParent_book_0 > .treeChildren').locator('> *')).toHaveCount(18);
		await expect(page.locator('#treeParent_book_1 > .treeChildren').locator('> *')).toHaveCount(24);
	});

	test('Split Alligator preserve page numbers', async ({ page }) => {
		await importAlligator(page, { excludeTitlePage: true, use1Step: true });

		await page.locator('#edit_menu').click();
		await page.locator('#multi_book_menu').click();
		await expect(page.getByTestId('multi-book-title-pages').locator('input')).toBeChecked();
		await page.getByTestId('multi-book-title-pages').click();
		await expect(page.getByTestId('multi-book-page-start-old').locator('input')).not.toBeChecked();
		await page.getByTestId('multi-book-page-start-old').click();
		await page.getByTestId('multi-book-ok').click();

		const state1 = await page.evaluate(() => {
			const { state } = (window as any).__lic.store;
			return {
				pagesLength: state.pages.length,
				pageNumbers: state.pages.map((p: any) => p.number),
				titlePageCount: state.pages.filter((p: any) => p.subtype === 'titlePage').length,
			};
		});
		expect(state1.pagesLength).toBe(43);
		expect(state1.pageNumbers).toEqual([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42]);
		expect(state1.titlePageCount).toBe(0);

		await page.locator('#treeParent_book_0').click();
		await expect(page.locator('#treeParent_book_0 > .treeChildren').locator('> *')).toHaveCount(18);
		await page.locator('#treeParent_book_1').click();
		await expect(page.locator('#treeParent_book_1 > .treeChildren').locator('> *')).toHaveCount(24);

		// Add title pages
		await page.locator('#edit_menu').click();
		await page.locator('#add_title_page_menu').click();

		const state2 = await page.evaluate(() => {
			const lic = (window as any).__lic;
			const { state } = lic.store;
			return {
				pagesLength: state.pages.length,
				pageNumbers: state.pages.map((p: any) => p.number),
				titlePageCount: state.pages.filter((p: any) => p.subtype === 'titlePage').length,
				currentPageId: lic.app.currentPageId,
				firstPageSubtype: lic.store.get.page(lic.app.currentPageId)?.subtype,
				firstPageNumber: lic.store.get.page(lic.app.currentPageId)?.number,
			};
		});
		expect(state2.pagesLength).toBe(45);
		expect(state2.pageNumbers).toEqual([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44]);
		expect(state2.titlePageCount).toBe(2);
		expect(state2.currentPageId).toBe(43);
		expect(state2.firstPageSubtype).toBe('titlePage');
		expect(state2.firstPageNumber).toBe(1);

		await expect(page.locator('#treeParent_book_0 > .treeChildren').locator('> *')).toHaveCount(19);
		await expect(page.locator('#treeParent_book_1 > .treeChildren').locator('> *')).toHaveCount(25);
	});

	test('Split Alligator into separate files', async ({ page }) => {
		await importAlligator(page, { use1Step: true });

		await page.locator('#edit_menu').click();
		await page.locator('#multi_book_menu').click();
		await expect(page.getByTestId('multi-book-many-lic-files').locator('input')).not.toBeChecked();
		await page.getByTestId('multi-book-many-lic-files').click();
		const downloadPromise = page.waitForEvent('download');
		await page.getByTestId('multi-book-ok').click();

		// Verify the saved ZIP structure
		const { filename, zip } = await getCapturedZip(downloadPromise);
		expect(filename).toBe('20015 - Alligator_instruction_books.zip');
		const folderName = '20015 - Alligator_instruction_books/';
		const fileBaseName = folderName + '20015 - Alligator_book_';
		expect(zip.files[folderName]).toBeDefined();
		expect(zip.files[fileBaseName + '1.lic']).toBeDefined();
		expect(zip.files[fileBaseName + '2.lic']).toBeDefined();

		const book1 = JSON.parse(await zip.files[fileBaseName + '1.lic'].async('string'));
		expect(book1.state.books.length).toBe(1);
		expect(book1.state.books[0].pages).toEqual(book1.state.pages.map((p: any) => p.id).slice(1));

		const book2 = JSON.parse(await zip.files[fileBaseName + '2.lic'].async('string'));
		expect(book2.state.books.length).toBe(1);
		expect(book2.state.books[0].pages).toEqual(book2.state.pages.map((p: any) => p.id).slice(1));

		// Verify in-memory state
		const state = await page.evaluate(() => {
			const { state } = (window as any).__lic.store;
			return {
				pagesLength: state.pages.length,
				pageNumbers: state.pages.map((p: any) => p.number),
				titlePageCount: state.pages.filter((p: any) => p.subtype === 'titlePage').length,
			};
		});
		expect(state.pagesLength).toBe(20);
		expect(state.pageNumbers).toEqual([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]);
		expect(state.titlePageCount).toBe(1);

		await expect(page.locator('#nav-tree > ul').locator('> *')).toHaveCount(2);
		await page.locator('#treeParent_book_0').click();
		await expect(page.locator('#treeParent_book_0 > .treeChildren').locator('> *')).toHaveCount(19);
		await expect(page.locator('#treeParent_book_1')).not.toBeAttached();
	});
});
