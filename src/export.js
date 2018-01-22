/* global module: false, jsPDF: false, JSZip: false, saveAs: false, LDRender: false, LDParse: false, util: false */

// eslint-disable-next-line no-implicit-globals, no-undef
InstructionExporter = (function() {
'use strict';

const api = {

	generatePDF: function(app, store) {

		app.busyText = 'Generating PDF';
		window.setTimeout(function() {
			const start = Date.now();
			const r = 0.75;  // = 72 / 96
			const pageSize = {width: store.state.pageSize.width * r, height: store.state.pageSize.height * r};

			const doc = new jsPDF(
				pageSize.width > pageSize.height ? 'landscape' : 'portrait',
				'pt',
				[pageSize.width, pageSize.height]
			);

			doc.setTextColor(0);
			doc.setFont('Helvetica');
			doc.setFontType('bold');
			doc.setLineWidth(1.5);
			doc.setDrawColor(0);

			store.state.pages.forEach(page => {
				if (!page) {
					return;
				}
				if (page.needsLayout) {
					store.mutations.layoutPage(page);
				}
				if (page.id > 0) {
					doc.addPage(pageSize.width, pageSize.height);
				}
				page.steps.forEach(stepID => {

					const step = store.get.step(stepID);
					const model = LDParse.model.get.submodelDescendant(store.model, step.submodel);

					if (step.csiID != null) {
						const csi = store.get.csi(step.csiID);
						const lastPart = (stepID === 0) ? null : step.parts[step.parts.length - 1];
						const renderResult = LDRender.renderModelData(model, 1000, lastPart);
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
						doc.roundedRect(
							(step.x + pli.x) * r,
							(step.y + pli.y) * r,
							(pli.width) * r,
							(pli.height) * r,
							10 * r, 10 * r, 'S'
						);

						pli.pliItems.forEach(id => {

							const pliItem = store.get.pliItem(id);
							const part = model.parts[pliItem.partNumber];
							const renderResult = LDRender.renderPartData(part, 1000);
							doc.addImage(
								renderResult.image, 'PNG',
								(step.x + pli.x + pliItem.x) * r,
								(step.y + pli.y + pliItem.y) * r,
								renderResult.width * r,
								renderResult.height * r
							);

							const pliQty = store.get.pliQty(pliItem.quantityLabel);
							doc.setFontSize(10);
							doc.text(
								(step.x + pli.x + pliItem.x + pliQty.x) * r,
								(step.y + pli.y + pliItem.y + pliQty.y + pliQty.height) * r,
								'x' + pliItem.quantity
							);
						});
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
				});

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
			});

			doc.save(store.get.modelNameBase('.pdf'));

			app.busyText = '';
			const end = Date.now();
			app.statusText = `PDF Generated Successfully (${util.formatTime(start, end)})`;
		}, 0);
	},
	generatePNGZip: function(app, store) {

		app.busyText = 'Generating PNG Zip';

		window.setTimeout(function() {
			const start = Date.now();
			const modelName = store.get.modelNameBase();
			const zip = new JSZip();
			var imgFolder = zip.folder(modelName);

			const canvas = document.getElementById('generateImagesCanvas');
			canvas.width = store.state.pageSize.width;
			canvas.height = store.state.pageSize.height;

			store.state.pages.forEach(page => {
				if (!page) {
					return;
				}
				if (page.needsLayout) {
					store.mutations.layoutPage(page);
				}
				app.drawPage(page, canvas);
				const pageName = (page.id === 0) ? 'Title Page.png' : `Page ${page.number}.png`;
				let data = canvas.toDataURL();
				data = data.substr(data.indexOf(',') + 1);
				imgFolder.file(pageName, data, {base64: true});
			});

			zip.generateAsync({type: 'blob'})
				.then(content => saveAs(content, modelName + '.zip'))
				.then(() => {
					app.busyText = '';
					const end = Date.now();
					app.statusText = `PNG Zip Generated Successfully (${util.formatTime(start, end)})`;
				});
		}, 0);
	}
};

if (typeof module !== 'undefined' && module.exports != null) {
	module.exports = api;
}

return api;

})();
