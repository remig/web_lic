/* global Vue: false, jsPDF: false, JSZip: false, saveAs: false, LDRender: false, LDParse: false, util: false */

// eslint-disable-next-line no-implicit-globals, no-undef
Menu = (function() {
'use strict';

let undoStack, app, store, originalState;

function enableIfModel() {
	return store != null && store.model != null;
}

const menu = [
	{name: 'File', children: [
		{
			text: 'Open...',
			cb: () => {
				document.getElementById('openFileChooser').click();
			}
		},
		{text: 'Open Recent (NYI)', cb: () => {}},
		{text: 'separator'},
		{
			text: 'Close',
			enabled: enableIfModel,
			cb: () => {
				store.model = null;
				store.replaceState(util.clone(originalState));
				undoStack.clear();
				app.clearState();
				util.emptyNode(document.getElementById('canvasHolder'));
				Vue.nextTick(() => {
					app.clearSelected();
					app.clearPage();
				});
			}
		},
		{
			text: 'Save',
			enabled: enableIfModel,
			cb: () => {
				const content = {
					partDictionary: LDParse.partDictionary,
					model: store.model,
					state: store.state
				};
				const blob = new Blob([JSON.stringify(content)], {type: 'text/plain;charset=utf-8'});
				saveAs(blob, store.state.modelName.replace(/\..+$/, '.lic'));
			}
		},
		{text: 'Save As... (NYI)', enabled: enableIfModel, cb: () => {}},
		{
			text: 'Import Model...',
			cb: () => {
				document.getElementById('uploadModelChooser').click();
			}
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
			text: () => 'Undo' + undoStack.undoText(),
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
			text: () => 'Redo' + undoStack.redoText(),
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
		{text: 'Snap To (NYI)', enabled: enableIfModel, cb: () => {}},
		{text: 'Brick Colors... (NYI)', enabled: enableIfModel, cb: () => {}}
	]},
	{name: 'View', children: [
		{text: 'Add Horizontal Guide', enabled: enableIfModel, cb: () => {}},
		{text: 'Add Vertical Guide', enabled: enableIfModel, cb: () => {}},
		{text: 'Remove Guides', enabled: enableIfModel, cb: () => {}},
		{text: 'separator'},
		{text: 'Zoom 100%', enabled: enableIfModel, cb: () => {}},
		{text: 'Zoom To Fit', enabled: enableIfModel, cb: () => {}},
		{text: 'Zoom In', enabled: enableIfModel, cb: () => {}},
		{text: 'Zoom Out', enabled: enableIfModel, cb: () => {}},
		{text: 'separator'},
		{text: 'Show One Page', enabled: enableIfModel, cb: () => {}},
		{text: 'Show Two Pages', enabled: enableIfModel, cb: () => {}}
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
					if (page.id > 0) {
						doc.addPage(pageSize.width, pageSize.height);
					}
					page.steps.forEach(stepID => {

						const step = store.state.steps[stepID];

						if (step.csiID != null) {
							const csi = store.state.csis[step.csiID];
							let renderResult;
							if (stepID === 0) {
								renderResult = LDRender.renderModelData(store.model, 1000);
							} else {
								const parts = store.state.steps[stepID].parts;
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
							const pli = store.state.plis[step.pliID];
							doc.roundedRect(
								(step.x + pli.x) * r,
								(step.y + pli.y) * r,
								(pli.width) * r,
								(pli.height) * r,
								10 * r, 10 * r, 'S'
							);

							pli.pliItems.forEach(idx => {

								const pliItem = store.state.pliItems[idx];
								const part = store.model.parts[pliItem.partNumber];
								const renderResult = LDRender.renderPartData(part, 1000);
								doc.addImage(
									renderResult.image, 'PNG',
									(step.x + pli.x + pliItem.x) * r,
									(step.y + pli.y + pliItem.y) * r,
									renderResult.width * r,
									renderResult.height * r
								);

								const pliQty = store.state.pliQtys[pliItem.quantityLabel];
								doc.setFontSize(10);
								doc.text(
									(step.x + pli.x + pliItem.x + pliQty.x) * r,
									(step.y + pli.y + pliItem.y + pliQty.y + pliQty.height) * r,
									'x' + pliItem.quantity
								);
							});
						}

						if (step.numberLabel) {
							doc.setFontSize(20);
							doc.text(
								(step.x + step.numberLabel.x) * r,
								(step.y + step.numberLabel.y + step.numberLabel.height) * r,
								step.number + ''
							);
						}
					});

					if (page.numberLabel) {
						doc.setFontSize(20);
						doc.text(
							(page.numberLabel.x) * r,
							(page.numberLabel.y + page.numberLabel.height) * r,
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
	originalState = util.clone(store.state);
	return menu;
};

})();
