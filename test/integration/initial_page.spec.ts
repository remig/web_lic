import { expect, test } from '@playwright/test';

import { expectCloseTo } from '../support/helpers';

const ids = {
	navbar: '#navMenu',
	statusBar: '#statusBar',
	leftPane: '.split-pane-left',
	rightPane: '#rightPane',
	filenameContainer: '#filename',
	menu: {
		file: '#file_menu',
		edit: '#edit_menu',
		view: '#view_menu',
	},
	subMenu: {
		file: {
			open: '#open_menu',
			close: '#close_menu',
			clearCache: '#clear_cache_menu',
		},
	},
	dialog: {
		whatsNew: '#whats_new_dialog',
		localeChooser: {
			container: '#locale_chooser_dialog',
			select: '#localeChooserSelect',
		},
	},
};

async function dismissWhatsNew(page: any) {
	await page.locator(`${ids.dialog.whatsNew} button.lic-btn`).click();
}

async function dismissLocaleChooser(page: any) {
	await page.locator(`${ids.dialog.localeChooser.container} button.lic-btn.primary`).click();
}

async function isMenuClosed(page: any, id: string) {
	await expect(page.locator(id)).toHaveClass(/dropdown/);
	await expect(page.locator(id)).not.toHaveClass(/\bopen\b/);
}

async function isMenuOpen(page: any, id: string) {
	await expect(page.locator(id)).toHaveClass(/dropdown/);
	await expect(page.locator(id)).toHaveClass(/\bopen\b/);
}

test.describe('Launch initial empty page', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => localStorage.clear());
		await page.goto('/');
		await page.evaluate(() => {
			(window as any).__lic.app.disableLocalStorage = true;
		});
	});

	test('Load basic page', async ({ page }) => {
		const body = await page.locator('body').boundingBox();
		expectCloseTo(body!.width, 1500, 1);
		expectCloseTo(body!.height, 900, 1);
	});

	test('Whats New dialog should show up with top & bottom inside the window', async ({ page }) => {
		const dialog = page.locator(ids.dialog.whatsNew);
		await expect(dialog).toBeVisible();
		await expect(dialog).toContainText("What's New");

		await expect(page.locator('.body')).toContainText('Version');

		const footerBox = await page.locator('.footer').boundingBox();
		expect(footerBox!.y + footerBox!.height).toBeLessThan(900);

		await dismissWhatsNew(page);
		await expect(dialog).not.toBeAttached();
	});

	test('Language chooser dialog should show up with a few languages in it', async ({ page }) => {
		await dismissWhatsNew(page);
		await expect(page.locator(ids.dialog.localeChooser.container)).toBeVisible();
		await expect(page.locator(ids.dialog.localeChooser.select)).toBeVisible();
		await dismissLocaleChooser(page);
		await expect(page.locator(ids.dialog.localeChooser.container)).not.toBeAttached();
	});

	test('General page layout is right', async ({ page }) => {
		await dismissWhatsNew(page);
		await dismissLocaleChooser(page);

		const navbarBox = await page.locator(ids.navbar).boundingBox();
		expectCloseTo(navbarBox!.width, 1500, 2);
		expectCloseTo(navbarBox!.height, 38, 2);

		const leftPaneBox = await page.locator(ids.leftPane).boundingBox();
		expectCloseTo(leftPaneBox!.width, 300, 10);
		expectCloseTo(leftPaneBox!.height, 837, 10);

		const rightPaneBox = await page.locator(ids.rightPane).boundingBox();
		expectCloseTo(rightPaneBox!.width, 1200, 10);
		expectCloseTo(rightPaneBox!.height, 837, 10);

		const statusBarBox = await page.locator(ids.statusBar).boundingBox();
		expectCloseTo(statusBarBox!.width, 1500, 10);
		expectCloseTo(statusBarBox!.height, 25, 2);
	});

	test('Welcome box should exist with some content', async ({ page }) => {
		await dismissWhatsNew(page);
		await dismissLocaleChooser(page);

		const gettingStartedBox = await page.locator('.gettingStarted').boundingBox();
		expectCloseTo(gettingStartedBox!.width, 1100, 5);
		expectCloseTo(gettingStartedBox!.height, 737, 5);

		await expect(page.getByTestId('get-started-list').locator('> *')).toHaveCount(4);
		await expect(page.getByTestId('get-started-import')).toBeVisible();
		await expect(page.getByTestId('get-started-open')).toBeVisible();
		await expect(page.getByTestId('get-started-learn')).toBeVisible();
	});

	test('Menus should exist and be clickable, with appropriately enabled / disabled content', async ({
		page,
	}) => {
		await dismissWhatsNew(page);
		await dismissLocaleChooser(page);

		await expect(page.locator(ids.filenameContainer)).not.toBeAttached();
		await isMenuClosed(page, ids.menu.file);
		await isMenuClosed(page, ids.menu.edit);
		await isMenuClosed(page, ids.menu.view);

		await page.locator(ids.menu.file).click();
		await isMenuOpen(page, ids.menu.file);
		await isMenuClosed(page, ids.menu.edit);
		await isMenuClosed(page, ids.menu.view);

		await expect(page.locator(ids.subMenu.file.open)).not.toHaveClass(/disabled/);
		await expect(page.locator(ids.subMenu.file.close)).toHaveClass(/disabled/);

		await page.locator(ids.menu.edit).click();
		await isMenuClosed(page, ids.menu.file);
		await isMenuOpen(page, ids.menu.edit);

		await page.locator(ids.menu.edit).click();
		await isMenuOpen(page, ids.menu.edit);
		await page.locator(ids.rightPane).click();
		await isMenuClosed(page, ids.menu.edit);

		await page.locator(ids.menu.file).click();
		await expect(page.locator(ids.subMenu.file.clearCache)).toBeAttached();

		await page.locator(ids.rightPane).click();
		await isMenuClosed(page, ids.menu.file);
	});
});
