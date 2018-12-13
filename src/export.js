/* Web Lic - Copyright (C) 2018 Remi Gagne */

/* global jsPDF: false, JSZip: false, saveAs: false */
'use strict';

import _ from './util';
import Draw from './draw';
import {changeDpiDataUrl} from 'changeDPI';
import LocaleManger from './translate';

function exportInstructions(app, store, exportType, hiResScale, drawPageCallback, doneCallback) {

	app.busyText = LocaleManger.translate(`dialog.busy_indicator.generating_${exportType}`);

	async function exportPage(page, canvas) {
		return new Promise(resolve => window.setTimeout(() => {
			if (!page) {
				resolve();
				return;
			}
			if (page.needsLayout) {
				store.mutations.page.layout({page});
			}
			Draw.page(page, canvas, {hiResScale, noCache: true});

			drawPageCallback(page, canvas);

			app.updateProgress(`Page ${page.number || 0}`);
			resolve();
		// Need 100ms delay to give browser time to redraw itself and update the progress bar.  Sucks.
		}, 100));
	}

	async function exportPages(pages, canvas) {
		for (let i = 0; i < pages.length; i++) {
			await exportPage(pages[i], canvas);
		}
	}

	window.setTimeout(() => {
		const start = Date.now();
		const canvas = document.getElementById('exportImagesCanvas');
		canvas.width = store.state.template.page.width * hiResScale;
		canvas.height = store.state.template.page.height * hiResScale;

		const pages = [store.get.titlePage(), ...store.state.pages, ...store.state.inventoryPages];
		app.updateProgress({stepCount: pages.length, text: 'Page 0'});
		exportPages(pages, canvas).then(() => {
			doneCallback(() => {
				app.updateProgress({clear: true});
				const end = Date.now();
				const time = _.formatTime(start, end);
				app.statusText = LocaleManger.translate(`status_bar.generated_${exportType}_successfully_@mf`,
					{exportType, time});
			});
		});
	}, 0);
}

function generatePDF(app, store, config) {

	// draw PDF in points so it comes out the exactsame size as the current page, with images at 96 dpi
	let hiResScale = 1;
	const pageSize = {
		width: store.state.template.page.width * 0.75,  // 0.75 = 72 / 96
		height: store.state.template.page.height * 0.75
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
		[pageSize.width, pageSize.height]
	);

	function drawPage(page, canvas) {
		const data = canvas.toDataURL('image/png');
		doc.addImage(data, 'PNG', 0, 0, pageSize.width, pageSize.height);
		if (!store.get.isLastPage(page)) {
			doc.addPage(pageSize.width, pageSize.height);
		}
	}

	function done(finishedCallback) {
		doc.save(store.get.modelFilenameBase('.pdf'));
		finishedCallback();
	}

	exportInstructions(app, store, 'PDF', hiResScale, drawPage, done);
}

function generatePNGZip(app, store, hiResScale = 1, dpi = 96) {

	const fn = store.get.modelFilenameBase();
	const zip = new JSZip();
	const imgFolder = zip.folder(fn);

	function drawPage(page, canvas) {
		const pageName = (page.type === 'titlePage') ? 'Page 1 Title Page.png' : `Page ${page.number}.png`;
		let data = canvas.toDataURL();
		if (dpi !== 96) {
			data = changeDpiDataUrl(data, dpi);
		}
		data = data.substr(data.indexOf(',') + 1);
		imgFolder.file(pageName, data, {base64: true});
	}

	function done(finishedCallback) {
		zip.generateAsync({type: 'blob'})
			.then(content => saveAs(content, fn + '.zip'))
			.then(finishedCallback);
	}

	exportInstructions(app, store, 'PNG', hiResScale, drawPage, done);
}

export default {generatePDF, generatePNGZip};
