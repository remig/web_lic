import { expect, test } from '@playwright/test';

import { importAlligator, reloadLicPage } from '../support/helpers';

test.describe('Test Rotating Things', () => {
	test.beforeEach(async ({ page }) => {
		await reloadLicPage(page);
	});

	test('Custom Rotation on CSI, with correct Rotate Icon', async ({ page }) => {
		await importAlligator(page, { excludeTitlePage: true, use1Step: true });

		await page.locator('#pageCanvas_1').click({ position: { x: 450, y: 400 } });
		await page.locator('#pageCanvas_1').click({ button: 'right' });
		await page.locator('#csi_rotate_cmenu').click();
		await page.locator('#csi_rotate_custom_cmenu').click();

		// Add 90 degree rotation about X, with rotate icon
		await page.locator('.rotationListBox button').click();
		await page.getByTestId('rotate-angle-input').fill('90');
		await expect(page.getByTestId('rotate-add-icon').locator('input')).not.toBeChecked();
		await page.getByTestId('rotate-add-icon').click();
		await page.getByTestId('rotate-ok').click();

		const state1 = await page.evaluate(() => {
			const lic = (window as any).__lic;
			return {
				csiRotation: lic.store.get.csi(4).rotation,
				rotateIconID: lic.store.get.step(3).rotateIconID,
			};
		});
		expect(state1.csiRotation).toEqual([{ axis: 'x', angle: 90 }]);
		expect(state1.rotateIconID).toBe(1);

		// Remove rotate icon; rotation should remain
		await page.locator('#pageCanvas_1').click({ position: { x: 450, y: 400 } });
		await page.locator('#pageCanvas_1').click({ button: 'right' });
		await page.locator('#csi_rotate_cmenu').click();
		await page.locator('#csi_rotate_custom_cmenu').click();
		await expect(page.getByTestId('rotate-add-icon').locator('input')).toBeChecked();
		await page.getByTestId('rotate-add-icon').click();
		await page.getByTestId('rotate-ok').click();

		const state2 = await page.evaluate(() => {
			const lic = (window as any).__lic;
			return {
				csiRotation: lic.store.get.csi(4).rotation,
				rotateIconID: lic.store.get.step(3).rotateIconID,
			};
		});
		expect(state2.csiRotation).toEqual([{ axis: 'x', angle: 90 }]);
		expect(state2.rotateIconID).toBeNull();
	});
});
