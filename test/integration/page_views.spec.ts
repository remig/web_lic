import { expect, test } from '@playwright/test';

import { importAlligator, reloadLicPage } from '../support/helpers';

test.describe('Test Page Views', () => {
	test.beforeEach(async ({ page }) => {
		await reloadLicPage(page);
	});

	test('Verify single page, side by side and scrolling page views', async ({ page }) => {
		await importAlligator(page, { use1Step: true });

		await expect(page.locator('#rightSubPane canvas')).toHaveCount(1);
		await expect(page.locator('#rightSubPane canvas').first()).toHaveAttribute('id', 'pageCanvas_43');
		await expect(page.locator('#rightSubPane .pageLockBtn')).toHaveCount(1);
		await expect(page.locator('#rightSubPane .pageLockBtn > *').first()).toHaveClass(/fa-lock-open/);

		// Click show one page — should not change anything
		await page.locator('#view_menu').click();
		await page.locator('#show_pages_menu').click();
		await page.locator('#show_one_page_menu').click();
		await expect(page.locator('#rightSubPane canvas')).toHaveCount(1);
		await expect(page.locator('#rightSubPane canvas').first()).toHaveAttribute('id', 'pageCanvas_43');

		// Two pages side by side
		await page.locator('#view_menu').click();
		await page.locator('#show_pages_menu').click();
		await page.locator('#show_two_pages_menu').click();
		await expect(page.locator('#rightSubPane canvas')).toHaveCount(2);
		await expect(page.locator('#rightSubPane canvas').first()).not.toHaveAttribute('id', 'pageCanvas_43');
		await expect(page.locator('#rightSubPane canvas').last()).toHaveAttribute('id', 'pageCanvas_43');

		await page.locator('#rightSubPane').click();
		await page.keyboard.press('PageDown');
		await expect(page.locator('#rightSubPane canvas')).toHaveCount(2);
		await expect(page.locator('#rightSubPane canvas').first()).toHaveAttribute('id', 'pageCanvas_1');
		await expect(page.locator('#rightSubPane canvas').last()).toHaveAttribute('id', 'pageCanvas_2');

		// One page scrolling
		await page.locator('#view_menu').click();
		await page.locator('#show_pages_menu').click();
		await page.locator('#show_one_scroll_menu').click();
		await expect(page.locator('#rightSubPane canvas')).toHaveCount(43, { timeout: 10000 });

		// Facing pages scrolling
		await page.locator('#view_menu').click();
		await page.locator('#show_pages_menu').click();
		await page.locator('#show_two_scroll_menu').click();
		await expect(page.locator('#rightSubPane canvas')).toHaveCount(44, { timeout: 10000 });
	});
});
