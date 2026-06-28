import JSZip from 'jszip';
import { expect, type Download, type Page } from '@playwright/test';

export type ImportOpts = {
	use1Step?: boolean;
	excludeTitlePage?: boolean;
	excludePartListPage?: boolean;
};

export async function reloadLicPage(page: Page): Promise<void> {
	await page.addInitScript(() => localStorage.clear());
	await page.goto('/');
	await page.locator('#whats_new_dialog button.lic-btn').click();
	await page.locator('#locale_chooser_dialog button.lic-btn.primary').click();
	await page.evaluate(() => {
		(window as any).__lic.app.disableLocalStorage = true;
	});
}

async function importModel(page: Page, name: string, opts: ImportOpts): Promise<void> {
	await page.getByTestId(`import-${name}`).click();
	await expect(page.getByTestId('import-use-max-steps').locator('input')).toBeChecked();
	if (opts.use1Step) {
		await page.getByTestId('import-use-max-steps').click();
	}
	if (opts.excludeTitlePage || opts.excludePartListPage) {
		await page.getByTestId('import-include-dropdown').click();
	}
	if (opts.excludeTitlePage) {
		await expect(page.getByTestId('include-titlePage').locator('i')).toBeVisible();
		await page.getByTestId('include-titlePage').click();
	}
	if (opts.excludePartListPage) {
		await expect(page.getByTestId('include-partListPage').locator('i')).toBeVisible();
		await page.getByTestId('include-partListPage').click();
	}
	await page.getByTestId('import-ok').click();
}

export const importTrivial = (page: Page, opts: ImportOpts = {}) =>
	importModel(page, 'trivial', opts);
export const importAlligator = (page: Page, opts: ImportOpts = {}) =>
	importModel(page, 'alligator', opts);
export const importXWing = (page: Page, opts: ImportOpts = {}) =>
	importModel(page, 'xwing', opts);

export function expectCloseTo(value: number, target: number, delta: number) {
	expect(Math.abs(value - target)).toBeLessThanOrEqual(delta);
}

export async function getCapturedZip(downloadPromise: Promise<Download>) {
	const download = await downloadPromise;
	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.from(chunk));
	}
	const zip = await JSZip.loadAsync(Buffer.concat(chunks));
	return { filename: download.suggestedFilename(), zip };
}
