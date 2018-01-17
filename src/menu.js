/* global Vue: false, jsPDF: false, JSZip: false, saveAs: false, LDRender: false, LDParse: false, util: false */

// eslint-disable-next-line no-implicit-globals, no-undef
Menu = (function() {
'use strict';

let undoStack, app, store;

function enableIfModel() {
	return store != null && store.model != null;
}

const menu = [
	{name: 'File', children: [
		{
			text: 'Open...',
			cb: () => {
				document.getElementById('openFileChooser').click();  // Triggers app.triggerOpenFile
			}
		},
		{text: 'Open Recent (NYI)', enabled: () => false, cb: () => {}},
		{text: 'separator'},
		{
			text: 'Close',
			enabled: enableIfModel,
			cb: function() {
				app.closeModel();
			}
		},
		{
			text: 'Save',
			enabled: enableIfModel,
			cb: () => {
				const content = {
					partDictionary: LDParse.partDictionary,
					colorTable: LDParse.colorTable,
					model: store.model,
					state: store.state
				};
				const blob = new Blob([JSON.stringify(content)], {type: 'text/plain;charset=utf-8'});
				saveAs(blob, store.state.modelName.replace(/\..+$/, '.lic'));
			}
		},
		{text: 'Save As... (NYI)', enabled: () => false, cb: () => {}},
		{
			text: 'Import Model...',
			cb: () => {
				document.getElementById('uploadModelChooser').click();
			},
			childrenXX: [
				{
					text: 'Creator Alligator',
					cb: () => {
						app.openRemoteLDrawModel('Creator/20015 - Alligator.mpd');
					}
				},
				{
					text: 'X-Wing',
					cb: () => {
						app.openRemoteLDrawModel('Star Wars/7140 - X-Wing Fighter.mpd');
					}
				},
				{
					text: 'Mobile Lab',
					cb: () => {
						app.openRemoteLDrawModel('Space/6901 - Mobile Lab.mpd');
					}
				}
			]
		},
		{text: 'separator'},
		{text: 'Save Template (NYI)', enabled: () => false, cb: () => {}},
		{text: 'Save Template As... (NYI)', enabled: () => false, cb: () => {}},
		{text: 'Load Template (NYI)', enabled: () => false, cb: () => {}},
		{text: 'Reset Template (NYI)', enabled: () => false, cb: () => {}}
	]},
	{name: 'Edit', children: [
		{
			id: 'undo',
			text: () => 'Undo ' + undoStack.undoText(),
			shortcut: 'ctrl+z',
			enabled: () => undoStack.isUndoAvailable(),
			cb: () => {
				if (undoStack.isUndoAvailable()) {
					undoStack.undo();
					Vue.nextTick(() => {
						app.$forceUpdate();
						app.clearSelected();
						app.drawCurrentPage();
					});
				}
			}
		},
		{
			id: 'redo',
			text: () => 'Redo ' + undoStack.redoText(),
			shortcut: 'ctrl+y',
			enabled: () => undoStack.isRedoAvailable(),
			cb: () => {
				if (undoStack.isRedoAvailable()) {
					undoStack.redo();
					Vue.nextTick(() => {
						app.$forceUpdate();
						app.clearSelected();
						app.drawCurrentPage();
					});
				}
			}
		},
		{text: 'separator'},
		{text: 'Snap To (NYI)', enabled: () => false, cb: () => {}},
		{text: 'Brick Colors... (NYI)', enabled: () => false, cb: () => {}}
	]},
	{name: 'View (NYI)', children: [
		{text: 'Add Horizontal Guide', enabled: () => false, cb: () => {}},
		{text: 'Add Vertical Guide', enabled: () => false, cb: () => {}},
		{text: 'Remove Guides', enabled: () => false, cb: () => {}},
		{text: 'separator'},
		{text: 'Zoom 100%', enabled: () => false, cb: () => {}},
		{text: 'Zoom To Fit', enabled: () => false, cb: () => {}},
		{text: 'Zoom In', enabled: () => false, cb: () => {}},
		{text: 'Zoom Out', enabled: () => false, cb: () => {}},
		{text: 'separator'},
		{text: 'Show One Page', enabled: () => false, cb: () => {}},
		{text: 'Show Two Pages', enabled: () => false, cb: () => {}}
	]},
	{name: 'Export', children: [
		{
			text: 'Generate PDF',
			enabled: enableIfModel,
			cb: () => {

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

						if (step.csiID != null) {
							const csi = store.get.csi(step.csiID);
							let renderResult;
							if (stepID === 0) {
								renderResult = LDRender.renderModelData(store.model, 1000);
							} else {
								const parts = store.get.step(stepID).parts;
								renderResult = LDRender.renderModelData(store.model, 1000, parts[parts.length - 1]);
							}
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

							pli.pliItems.forEach(idx => {

								const pliItem = store.get.pliItem(idx);
								const part = store.model.parts[pliItem.partNumber];
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
				});

				doc.save(store.state.modelName.replace(/\..+$/, '.pdf'));
			}
		},
		{
			text: 'Generate PNG Images',
			enabled: enableIfModel,
			cb: () => {

				const modelName = store.state.modelName.replace(/\..+$/, '').replace(/\//g, '-');
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
					.then(content => saveAs(content, `${modelName}.zip`));
			}
		}
	]}
];

return function(localApp, localStore, localUndoStack) {
	app = localApp;
	store = localStore;
	undoStack = localUndoStack;
	return menu;
};

})();
