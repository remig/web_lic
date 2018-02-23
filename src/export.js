/* global module: false, jsPDF: false, JSZip: false, saveAs: false, LDRender: false, LDParse: false, util: false */

// eslint-disable-next-line no-implicit-globals, no-undef
InstructionExporter = (function() {
'use strict';

const api = {

	generatePDF: function(app, store) {

		app.busyText = 'Generating PDF';

		async function exportPage(page, idx, pageSize, doc, r) {
			return new Promise(resolve => window.setTimeout(() => {
				if (!page) {
					return;
				}
				if (idx > 0) {
					doc.addPage(pageSize.width, pageSize.height);
				}
				if (page.needsLayout) {
					store.mutations.layoutPage(page);
				}
				page.steps.forEach(step => exportStep(step, doc, r));

				if (page.numberLabel != null) {
					const lbl = store.get.pageNumber(page.numberLabel);
					doc.setFontSize(20);
					doc.text(
						lbl.x * r,
						(lbl.y + lbl.height) * r,
						page.number + ''
					);
				}
				if (page.labels != null) {
					page.labels.forEach(lblID => {
						const lbl = store.get.label(lblID);
						doc.setFontSize(parseInt(util.fontToFontParts(lbl.font).fontSize, 10));
						doc.text(
							lbl.x * r,
							(lbl.y + lbl.height) * r,
							lbl.text
						);
					});
				}
				app.updateProgress(`Page ${idx}`);
				resolve();
			}, 100));  // 100ms delay is needed to give the browser enough time to redraw itself and update the progress bar.  Sucks.
		}

		function exportStep(stepID, doc, r) {
			const step = store.get.step(stepID);
			const partList = store.get.partList(step);
			const model = LDParse.model.get.submodelDescendant(store.model, step.submodel);

			if (step.csiID != null) {
				const csi = store.get.csi(step.csiID);
				const renderResult = LDRender.renderModelData(model, 1000, {partList});
				doc.addImage(
					renderResult.image, 'PNG',
					(step.x + csi.x) * r,
					(step.y + csi.y) * r,
					renderResult.width * r,
					renderResult.height * r
				);
			}

			if (step.pliID != null) {

				const pli = store.get.pli(step.pliID);
				if (!util.isEmpty(pli.pliItems)) {
					doc.roundedRect(
						(step.x + pli.x) * r,
						(step.y + pli.y) * r,
						(pli.width) * r,
						(pli.height) * r,
						10 * r, 10 * r, 'S'
					);

					pli.pliItems.forEach(id => {
						const pliItem = store.get.pliItem(id);
						const part = model.parts[pliItem.partNumbers[0]];
						const renderResult = LDRender.renderPartData(part, 1000);
						doc.addImage(
							renderResult.image, 'PNG',
							(step.x + pli.x + pliItem.x) * r,
							(step.y + pli.y + pliItem.y) * r,
							renderResult.width * r,
							renderResult.height * r
						);

						const pliQty = store.get.pliQty(pliItem.pliQtyID);
						doc.setFontSize(10);
						doc.text(
							(step.x + pli.x + pliItem.x + pliQty.x) * r,
							(step.y + pli.y + pliItem.y + pliQty.y + pliQty.height) * r,
							'x' + pliItem.quantity
						);
					});
				}
			}

			if (step.numberLabel != null) {
				const lbl = store.get.stepNumber(step.numberLabel);
				doc.setFontSize(20);
				doc.text(
					(step.x + lbl.x) * r,
					(step.y + lbl.y + lbl.height) * r,
					step.number + ''
				);
			}
		}

		async function exportPages(pages, pageSize, doc, r) {
			for (var i = 0; i < pages.length; i++) {
				await exportPage(pages[i], i, pageSize, doc, r);
			}
		}

		function done(app, doc, start) {
			doc.save(store.get.modelFilenameBase('.pdf'));
			app.updateProgress({clear: true});
			const end = Date.now();
			app.statusText = `PDF Generated Successfully (${util.formatTime(start, end)})`;
		}

		window.setTimeout(() => {
			const start = Date.now();
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

			doc.setTextColor(0)
				.setFont('Helvetica')
				.setFontType('bold')
				.setLineWidth(1.5)
				.setDrawColor(0);

			const pages = [store.state.titlePage].concat(store.state.pages);
			app.updateProgress({stepCount: pages.length, text: 'Page 0'});
			exportPages(pages, pageSize, doc, r).then(() => {
				done(app, doc, start);
			});
		}, 0);
	},
	generatePNGZip: function(app, store) {

		app.busyText = 'Generating PNG Zip';

		async function exportPage(page, canvas, imgFolder) {
			return new Promise(resolve => window.setTimeout(() => {
				if (!page) {
					return;
				}
				if (page.needsLayout) {
					store.mutations.layoutPage(page);
				}
				app.drawPage(page, canvas);
				const pageName = (page.type === 'titlePage') ? 'Page 0 Title Page.png' : `Page ${page.number}.png`;
				let data = canvas.toDataURL();
				data = data.substr(data.indexOf(',') + 1);
				imgFolder.file(pageName, data, {base64: true});
				app.updateProgress(`Page ${page.number || 0}`);
				resolve();
			}, 100));
		}

		async function exportPages(pages, canvas, imgFolder) {
			for (let i = 0; i < pages.length; i++) {
				await exportPage(pages[i], canvas, imgFolder);
			}
		}

		function done(app, zip, fn, start) {
			zip.generateAsync({type: 'blob'})
				.then(content => saveAs(content, fn + '.zip'))
				.then(() => {
					app.updateProgress({clear: true});
					const end = Date.now();
					app.statusText = `PNG Zip Generated Successfully (${util.formatTime(start, end)})`;
				});
		}

		window.setTimeout(() => {
			const start = Date.now();
			const fn = store.get.modelFilenameBase();
			const zip = new JSZip();
			const imgFolder = zip.folder(fn);

			const canvas = document.getElementById('generateImagesCanvas');
			canvas.width = store.state.pageSize.width;
			canvas.height = store.state.pageSize.height;

			const pages = [store.state.titlePage].concat(store.state.pages);
			app.updateProgress({stepCount: pages.length, text: 'Page 0'});
			exportPages(pages, canvas, imgFolder).then(() => {
				done(app, zip, fn, start);
			});
		}, 0);
	}
};

if (typeof module !== 'undefined' && module.exports != null) {
	module.exports = api;
}

return api;

})();
