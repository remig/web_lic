/* global Vue: false, saveAs: false, LDParse: false, InstructionExporter: false */

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
				InstructionExporter.generatePDF(app, store);
			}
		},
		{
			text: 'Generate PNG Images',
			enabled: enableIfModel,
			cb: () => {
				InstructionExporter.generatePNGZip(app, store);
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
