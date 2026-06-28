import { expect, test } from '@playwright/test';

import { importAlligator, reloadLicPage } from '../support/helpers';

test.describe('Test Callouts', () => {
	test.beforeEach(async ({ page }) => {
		await reloadLicPage(page);
	});

	test('Custom Rotation on CSI, with correct Rotate Icon', async ({ page }) => {
		await importAlligator(page, { excludeTitlePage: true, use1Step: true });

		await page.locator('#pageCanvas_1').click({ position: { x: 200, y: 350 } });
		await page.locator('#pageCanvas_1').click({ button: 'right' });
		expect(
			await page.evaluate(() => (window as any).__lic.app.selectedItemLookup),
		).toEqual({ id: 3, type: 'step' });

		await page.locator('#step_add_callout_cmenu').click();

		await page.locator('#pageCanvas_1').click({ position: { x: 500, y: 400 } });
		await page.locator('#pageCanvas_1').click({ button: 'right' });
		await page.locator('#csi_select_part_cmenu').click();
		await page.locator('#select_part_0_cmenu').click();
		await page.locator('#pageCanvas_1').click({ button: 'right' });
		await page.locator('#part_add_to_callout_cmenu').click();

		await page.locator('#pageCanvas_1').click({ position: { x: 40, y: 415 } });
		expect(
			await page.evaluate(() => (window as any).__lic.app.selectedItemLookup),
		).toEqual({ id: 44, type: 'step' });

		await page.locator('#pageCanvas_1').click({ button: 'right' });
		await page.locator('#step_prepend_cmenu').click();

		const state1 = await page.evaluate(() => {
			const lic = (window as any).__lic;
			const callout = lic.store.state.callouts[1];
			const steps = callout.steps.map(lic.store.get.step);
			return {
				calloutsLength: lic.store.state.callouts.length,
				calloutSteps: callout.steps,
				stepNumbers: steps.map((s: any) => s.number),
				stepNumberLabelIDs: steps.map((s: any) => s.numberLabelID),
				stepModels: steps.map((s: any) => s.model),
				stepParts: steps.map((s: any) => s.parts),
			};
		});
		expect(state1.calloutsLength).toBe(2);
		expect(state1.calloutSteps).toEqual([45, 44]);
		expect(state1.stepNumbers).toEqual([1, 2]);
		expect(state1.stepNumberLabelIDs).toEqual([87, 88]);
		expect(state1.stepModels[0]).toEqual({ filename: '20015 - Alligator.mpd', parentStepID: null });
		expect(state1.stepModels[1]).toEqual({ filename: '20015 - Alligator.mpd', parentStepID: null });
		expect(state1.stepParts[0]).toEqual([]);
		expect(state1.stepParts[1]).toEqual([0]);

		await page.locator('#pageCanvas_1').click({ position: { x: 40, y: 415 } });
		expect(
			await page.evaluate(() => (window as any).__lic.app.selectedItemLookup),
		).toEqual({ id: 45, type: 'step' });

		await page.locator('#pageCanvas_1').click({ button: 'right' });
		await page.locator('#step_append_cmenu').click();

		const state2 = await page.evaluate(() => {
			const lic = (window as any).__lic;
			const callout = lic.store.state.callouts[1];
			const steps = callout.steps.map(lic.store.get.step);
			return {
				calloutsLength: lic.store.state.callouts.length,
				calloutSteps: callout.steps,
				stepNumbers: steps.map((s: any) => s.number),
				stepNumberLabelIDs: steps.map((s: any) => s.numberLabelID),
				stepModels: steps.map((s: any) => s.model),
				stepParts: steps.map((s: any) => s.parts),
			};
		});
		expect(state2.calloutsLength).toBe(2);
		expect(state2.calloutSteps).toEqual([45, 46, 44]);
		expect(state2.stepNumbers).toEqual([1, 2, 3]);
		expect(state2.stepNumberLabelIDs).toEqual([87, 89, 88]);
		expect(state2.stepModels).toEqual([
			{ filename: '20015 - Alligator.mpd', parentStepID: null },
			{ filename: '20015 - Alligator.mpd', parentStepID: null },
			{ filename: '20015 - Alligator.mpd', parentStepID: null },
		]);
		expect(state2.stepParts).toEqual([[], [], [0]]);

		await page.locator('#pageCanvas_1').click({ position: { x: 140, y: 415 } });
		expect(
			await page.evaluate(() => (window as any).__lic.app.selectedItemLookup),
		).toEqual({ id: 48, type: 'csi' });

		await page.locator('#pageCanvas_1').click({ button: 'right' });
		await page.locator('#csi_select_part_cmenu').click();
		await page.locator('#select_part_0_cmenu').click();
		expect(
			await page.evaluate(() => (window as any).__lic.app.selectedItemLookup),
		).toEqual({ id: 0, stepID: 44, type: 'part' });

		await page.locator('#pageCanvas_1').click({ button: 'right' });
		await page.locator('#part_move_cmenu').click();
		await page.locator('#part_move_prev_cmenu').click();

		const state3 = await page.evaluate(() => {
			const lic = (window as any).__lic;
			const callout = lic.store.state.callouts[1];
			const steps = callout.steps.map(lic.store.get.step);
			return {
				calloutsLength: lic.store.state.callouts.length,
				calloutSteps: callout.steps,
				stepParts: steps.map((s: any) => s.parts),
			};
		});
		expect(state3.calloutsLength).toBe(2);
		expect(state3.calloutSteps).toEqual([45, 46, 44]);
		expect(state3.stepParts).toEqual([[], [0], []]);
	});
});
