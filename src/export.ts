/* Web Lic - Copyright (C) 2018 Remi Gagne */

import JSZip from 'jszip';
import {jsPDF} from 'jspdf';
import {saveAs} from 'file-saver';

import _ from './util';
import {Draw} from './draw';
import {changeDpiDataUrl} from './changedpi';
import {t} from './translations';
import {statusText, busyText, updateProgress} from './ui_reactive_state';
import {Store} from './store';
import {Page} from './item_types';

function exportInstructions(
	store: Store,
	exportType: 'PNG' | 'PDF',
	hiResScale: number,
	drawPageCallback: (page: Page, canvas: HTMLCanvasElement) => void,
	doneCallback: (finishedCallback: any) => void,
) {

	busyText.value = t(`dialog.busy_indicator.generating_${exportType}`);

	async function exportPage(page: Page, canvas: HTMLCanvasElement) {
		return new Promise<void>(resolve => window.setTimeout(() => {
			if (!page) {
				resolve();
				return;
			}
			if (page.needsLayout) {
				store.mutations.page.layout({page});
			}
			Draw.page(page, canvas, {hiResScale, noCache: true, noGrid: true});

			drawPageCallback(page, canvas);

			updateProgress(`Page ${page.number || 0}`);
			resolve();
		// Need 100ms delay to give browser time to redraw itself and update the progress bar.  Sucks.
		}, 100));
	}

	async function exportPages(pages: Page[], canvas: HTMLCanvasElement) {
		for (let i = 0; i < pages.length; i++) {
			await exportPage(pages[i], canvas);
		}
	}

	window.setTimeout(() => {
		const start = Date.now();
		const canvas = document.getElementById('exportImagesCanvas') as HTMLCanvasElement;
		canvas.width = (store.state?.template?.page?.width ?? 0) * hiResScale;
		canvas.height = (store.state?.template?.page?.height ?? 0) * hiResScale;

		const pages = store.state.pages.slice(1);  // Skip template page
		updateProgress({stepCount: pages.length, text: 'Page 0'});
		exportPages(pages, canvas).then(() => {
			doneCallback(() => {
				updateProgress({clear: true});
				const end = Date.now();
				const time = _.formatTime(start, end);
				statusText.value = t(
					`action.export.${exportType.toLowerCase()}.success_message_@mf`,
					{exportType, time},
				);
			});
		});
	}, 0);
}

interface PDFConfig {
	dpi: number,
	pageSize: {width: number, height: number}
}

function generatePDF(store: Store, config?: PDFConfig) {

	// draw PDF in points so it comes out the exact same size as the current page, with images at 96 dpi
	let hiResScale = 1;
	const pageSize = {
		width: store.state.template.page.width * 0.75,  // 0.75 = 72 / 96
		height: store.state.template.page.height * 0.75,
	};

	if (config) {
		// If we have a custom page size, scale images to fit into custom page at custom dpi
		hiResScale = config.dpi / 96;  // Adjust scale to match new DPI
		// Adjust scale to fit exactly inside new page size
		hiResScale = hiResScale * config.pageSize.width / pageSize.width;
		pageSize.width = config.pageSize.width;
		pageSize.height = config.pageSize.height;
	}

	const doc = new jsPDF(
		pageSize.width > pageSize.height ? 'landscape' : 'portrait',
		'pt',
		[pageSize.width, pageSize.height],
	);

	function drawPage(page: Page, canvas: HTMLCanvasElement) {
		const data = canvas.toDataURL('image/jpeg');
		doc.addImage(data, 'JPEG', 0, 0, pageSize.width, pageSize.height);
		if (!store.get.isLastPage(page)) {
			doc.addPage([pageSize.width, pageSize.height]);
		}
	}

	function done(finishedCallback: () => void) {
		doc.save(store.get.modelFilenameBase('.pdf'));
		finishedCallback();
	}

	exportInstructions(store, 'PDF', hiResScale, drawPage, done);
}

function generatePNGZip(store: Store, hiResScale: number = 1, dpi: number = 96) {

	const fn = store.get.modelFilenameBase();
	const zip = new JSZip();
	const imgFolder = zip.folder(fn);

	function drawPage(page: Page, canvas: HTMLCanvasElement) {
		if (!imgFolder) {
			throw 'failed to create zip';
		}
		const pageName = (page.subtype === 'titlePage')
			? 'Page 1 Title Page.png'
			: `Page ${page.number}.png`;
		let data = canvas.toDataURL();
		if (dpi !== 96) {
			data = changeDpiDataUrl(data, dpi);
		}
		data = data.substr(data.indexOf(',') + 1);
		imgFolder.file(pageName, data, {base64: true});
	}

	function done(finishedCallback: () => void) {
		zip.generateAsync({type: 'blob'})
			.then((content: any) => saveAs(content, fn + '.zip'))
			.then(finishedCallback);
	}

	exportInstructions(store, 'PNG', hiResScale, drawPage, done);
}

export default {generatePDF, generatePNGZip};
