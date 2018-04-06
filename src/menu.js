/* global Vue: false, $: false */
'use strict';

const InstructionExporter = require('./export');
const store = require('./store');
const undoStack = require('./undoStack');
let app;

Vue.component('menu-list', {
	props: ['menuEntries'],
	template: '#menuTemplate',
	methods: {
		resolveProperty(p) {
			return (typeof p === 'function') ? p() : p;
		},
		toggleSubMenu(e) {
			e.preventDefault();
			e.stopPropagation();
			$('.dropdown-submenu.open').removeClass('open');
			$(e.target.parentElement).addClass('open');
		},
		hasVisibleChildren(child) {
			if (!child.children) {
				return true;
			} else if (typeof child.children === 'function') {
				return true;  // TODO: For now, all menu children defined by a function are forced visible
			}
			return child.children.some(el => el.shown ? el.shown() : true);
		},
		show(e) {
			$('#contextMenu')
				.css({
					'outline-style': 'none',
					display: 'block',
					left: e.pageX,
					top: e.pageY
				}).focus();
		},
		hide() {
			$('.dropdown-submenu.open').removeClass('open');
			$('#contextMenu').css('display', 'none');
		}
	}
});

Vue.component('nav-menu', {
	props: ['menuEntryList', 'filename', 'version'],
	template: '#navMenuTemplate'
});

function enableIfModel() {
	return store != null && store.model != null;
}

const menu = [
	{name: 'File', children: [
		{
			text: 'Open Lic File...',
			id: 'open',
			cb() {
				document.getElementById('openFileChooser').click();  // Triggers app.triggerOpenFile
			}
		},
		{text: 'Open Recent (NYI)', enabled: () => false, cb: () => {}},
		{text: 'separator'},
		{
			text: 'Close',
			enabled: enableIfModel,
			cb() {
				app.closeModel();
			}
		},
		{
			text: 'Save',
			shortcut: 'ctrl+s',
			enabled: enableIfModel,
			cb() {
				app.save();
			}
		},
		{
			text: 'Import Custom Model...',
			cb() {
				document.getElementById('uploadModelChooser').click();
			}
		},
		{
			text: 'Import Built-in Model...',
			children: [
				{
					text: 'Trivial Model',
					cb() {
						app.importRemoteModel('trivial_model.ldr');
					}
				},
				{
					text: 'Creator Alligator',
					cb() {
						app.importRemoteModel('Creator/20015 - Alligator.mpd');
					}
				},
				{
					text: 'X-Wing',
					cb() {
						app.importRemoteModel('Star Wars/7140 - X-Wing Fighter.mpd');
					}
				},
				{
					text: 'Mobile Lab',
					cb() {
						app.importRemoteModel('Space/6901 - Mobile Lab.mpd');
					}
				}
			]
		},
		{text: 'separator'},
		{text: 'Save Template (NYI)', enabled: () => false, cb: () => {}},
		{text: 'Save Template As... (NYI)', enabled: () => false, cb: () => {}},
		{text: 'Load Template (NYI)', enabled: () => false, cb: () => {}},
		{text: 'Reset Template (NYI)', enabled: () => false, cb: () => {}},
		{text: 'separator'},
		{
			text: 'Clear Local Cache',
			cb() {
				window.localStorage.removeItem('lic_state');
			}
		}
	]},
	{name: 'Edit', children: [
		{
			id: 'undo',
			text: () => 'Undo ' + undoStack.undoText(),
			shortcut: 'ctrl+z',
			enabled: () => undoStack.isUndoAvailable(),
			cb() {
				if (undoStack.isUndoAvailable()) {
					undoStack.undo();
					app.redrawUI(true);
				}
			}
		},
		{
			id: 'redo',
			text: () => 'Redo ' + undoStack.redoText(),
			shortcut: 'ctrl+y',
			enabled: () => undoStack.isRedoAvailable(),
			cb() {
				if (undoStack.isRedoAvailable()) {
					undoStack.redo();
					app.redrawUI(true);
				}
			}
		},
		{text: 'separator'},
		{
			text: 'Add Title Page',
			shown: () => enableIfModel() && store.get.titlePage() == null,
			cb() {
				undoStack.commit('addTitlePage', null, this.text);
				app.setCurrentPage({type: 'titlePage', id: 0});
				app.redrawUI(true);
			}
		},
		{
			text: 'Remove Title Page',
			shown: () => enableIfModel() && store.get.titlePage() != null,
			cb() {
				app.setCurrentPage({type: 'page', id: 0});
				undoStack.commit('removeTitlePage', null, this.text);
				app.redrawUI(true);
			}
		},
		{
			text: 'Show PLIs',
			shown: () => enableIfModel() && !store.state.plisVisible,
			cb() {
				undoStack.commit('pli.toggleVisibility', {visible: true}, this.text);
				app.redrawUI(true);
			}
		},
		{
			text: 'Hide PLIs',
			shown: () => enableIfModel() && store.state.plisVisible,
			cb() {
				undoStack.commit('pli.toggleVisibility', {visible: false}, this.text);
				app.redrawUI(true);
			}
		},
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
			cb() {
				InstructionExporter.generatePDF(app, store);
			}
		},
		{
			text: 'Generate PNG Images',
			enabled: enableIfModel,
			cb() {
				InstructionExporter.generatePNGZip(app, store);
			}
		}
	]}
];

module.exports = function Menu(localApp) {
	app = localApp;
	return menu;
};
