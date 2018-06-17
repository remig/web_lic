/* global jsPDF: false, JSZip: false, saveAs: false */
'use strict';

import _ from './util';
import Draw from './draw';

function exportInstructions(app, store, exportType, scale, drawPageCallback, doneCallback) {

	app.busyText = `Generating ${exportType}`;

	async function exportPage(page, canvas) {
		return new Promise(resolve => window.setTimeout(() => {
			if (!page) {
				resolve();
				return;
			}
			if (page.needsLayout) {
				store.mutations.page.layout({page});
			}
			Draw.page(page, canvas, {scale, noCache: true});

			drawPageCallback(page, canvas);

			app.updateProgress(`Page ${page.number || 0}`);
			resolve();
		}, 100));  // 100ms delay is needed to give the browser enough time to redraw itself and update the progress bar.  Sucks.
	}

	async function exportPages(pages, canvas) {
		for (var i = 0; i < pages.length; i++) {
			await exportPage(pages[i], canvas);
		}
	}

	window.setTimeout(() => {
		const start = Date.now();
		const canvas = document.getElementById('exportImagesCanvas');
		canvas.width = store.state.template.page.width * scale;
		canvas.height = store.state.template.page.height * scale;

		const pages = [store.get.titlePage(), ...store.state.pages];
		app.updateProgress({stepCount: pages.length, text: 'Page 0'});
		exportPages(pages, canvas).then(() => {
			doneCallback(() => {
				app.updateProgress({clear: true});
				const end = Date.now();
				app.statusText = `${exportType} Generated Successfully (${_.formatTime(start, end)})`;
			});
		});
	}, 0);
}

function generatePDF(app, store, config) {

	// By default, draw PDF in points so it comes out the exactsame size as the current page, with images at 96 dpi
	let units = 'pt', scale = 1;
	const pageSize = {
		width: store.state.template.page.width * 0.75,  // 0.75 = 72 / 96
		height: store.state.template.page.height * 0.75
	};

	if (config) {
		// If we have a custom page size, scale images to fit into custom page at custom dpi
		scale = config.dpi / 96;  // Adjust scale to match new DPI
		scale = scale * config.pageSize.width / pageSize.width;  // Adjust scale to fit exactly inside new page size
		pageSize.width = config.pageSize.width;
		pageSize.height = config.pageSize.height;
		units = (config.units === 'point') ? 'pt' : config.units;
	}

	const doc = new jsPDF(
		pageSize.width > pageSize.height ? 'landscape' : 'portrait',
		units,
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

	exportInstructions(app, store, 'PDF', scale, drawPage, done);
}

function generatePNGZip(app, store, scale = 1) {

	const fn = store.get.modelFilenameBase();
	const zip = new JSZip();
	const imgFolder = zip.folder(fn);

	function drawPage(page, canvas) {
		const pageName = (page.type === 'titlePage') ? 'Page 0 Title Page.png' : `Page ${page.number}.png`;
		let data = canvas.toDataURL();
		data = data.substr(data.indexOf(',') + 1);
		imgFolder.file(pageName, data, {base64: true});
	}

	function done(finishedCallback) {
		zip.generateAsync({type: 'blob'})
			.then(content => saveAs(content, fn + '.zip'))
			.then(finishedCallback);
	}

	exportInstructions(app, store, 'PNG Zip', scale, drawPage, done);
}

export default {generatePDF, generatePNGZip};
