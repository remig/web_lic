/* global jsPDF: false, JSZip: false, saveAs: false */
'use strict';

const util = require('./util');

function exportInstructions(app, store, exportType, drawPageCallback, doneCallback) {

	const scale = 1;  // TODO: create UI to set this to support hi-res export
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
			app.drawPage(page, canvas, scale);

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
		const canvas = document.getElementById('generateImagesCanvas');
		canvas.width = store.state.pageSize.width * scale;
		canvas.height = store.state.pageSize.height * scale;

		const pages = [store.get.titlePage(), ...store.state.pages];
		app.updateProgress({stepCount: pages.length, text: 'Page 0'});
		exportPages(pages, canvas).then(() => {
			doneCallback(() => {
				app.updateProgress({clear: true});
				const end = Date.now();
				app.statusText = `${exportType} Generated Successfully (${util.formatTime(start, end)})`;
			});
		});
	}, 0);
}

const api = {

	generatePDF: function(app, store) {

		const r = 0.75;  // = 72 / 96
		const pageSize = {
			width: store.state.pageSize.width * r,
			height: store.state.pageSize.height * r
		};
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

		exportInstructions(app, store, 'PDF', drawPage, done);
	},
	generatePNGZip: function(app, store) {

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

		exportInstructions(app, store, 'PNG Zip', drawPage, done);
	}
};

module.exports = api;
