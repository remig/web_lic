import { expect, test } from '@playwright/test';

import { importTrivial, reloadLicPage } from '../support/helpers';

test.describe('Test Deleting Parts', () => {
	test.beforeEach(async ({ page }) => {
		await reloadLicPage(page);
	});

	test('Delete the last part in a step', async ({ page }) => {
		await importTrivial(page, { excludeTitlePage: true, excludePartListPage: true });

		await page.locator('#pageCanvas_1').click({ position: { x: 220, y: 250 } });
		await page.locator('#pageCanvas_1').click({ button: 'right' });
		await page.locator('#csi_select_part_cmenu').click();
		await page.locator('#select_part_0_cmenu').click();
		await page.locator('#pageCanvas_1').click({ button: 'right' });
		await page.locator('#part_change_name_cmenu').click();
		await page.locator('#part_delete_cmenu').click();

		const state = await page.evaluate(() => {
			const lic = (window as any).__lic;
			return {
				pagesLength: lic.store.state.pages.length,
				inventoryPagesLength: lic.store.get.inventoryPages().length,
				modelPartsLength: lic.store.model.parts.length,
				pliItemsLength: lic.store.state.pliItems.length,
				step3PartsLength: lic.store.state.steps[3].parts.length,
				pli1PliItemsLength: lic.store.state.plis[1].pliItems.length,
			};
		});
		expect(state.pagesLength).toBe(2);
		expect(state.inventoryPagesLength).toBe(0);
		expect(state.modelPartsLength).toBe(2);
		expect(state.pliItemsLength).toBe(4);
		expect(state.step3PartsLength).toBe(0);
		expect(state.pli1PliItemsLength).toBe(0);
	});

	test('Delete the last part in a step with instructions', async ({ page }) => {
		await importTrivial(page, { excludeTitlePage: true });

		await page.locator('#pageCanvas_1').click({ position: { x: 220, y: 250 } });
		await page.locator('#pageCanvas_1').click({ button: 'right' });
		await page.locator('#csi_select_part_cmenu').click();
		await page.locator('#select_part_0_cmenu').click();
		await page.locator('#pageCanvas_1').click({ button: 'right' });
		await page.locator('#part_change_name_cmenu').click();
		await page.locator('#part_delete_cmenu').click();

		const state = await page.evaluate(() => {
			const lic = (window as any).__lic;
			return {
				pagesLength: lic.store.state.pages.length,
				modelPartsLength: lic.store.model.parts.length,
				pliItemsLength: lic.store.state.pliItems.length,
				page2PliItemsLength: lic.store.state.pages[2].pliItems.length,
				step3PartsLength: lic.store.state.steps[3].parts.length,
				pli1PliItemsLength: lic.store.state.plis[1].pliItems.length,
			};
		});
		expect(state.pagesLength).toBe(3);
		expect(state.modelPartsLength).toBe(2);
		expect(state.pliItemsLength).toBe(6);
		expect(state.page2PliItemsLength).toBe(2);
		expect(state.step3PartsLength).toBe(0);
		expect(state.pli1PliItemsLength).toBe(0);
	});
});
