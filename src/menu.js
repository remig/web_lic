/* global Vue: false, $: false */
'use strict';

const _ = require('./util');
const InstructionExporter = require('./export');
const store = require('./store');
const undoStack = require('./undoStack');
const openFileHandler = require('./fileUploader');

let app;

Vue.component('menu-list', {
	props: ['menuEntries', 'selectedItem'],
	template: '#menuTemplate',
	methods: {
		resolveProperty(p) {
			return (typeof p === 'function') ? p(this.selectedItem) : p;
		},
		triggerMenu(entry, e) {
			if (entry.children) {
				this.toggleSubMenu(e);
			} else if (typeof entry.cb === 'string') {
				app[entry.cb]();
			} else {
				entry.cb(this.selectedItem);
			}
		},
		toggleSubMenu(e) {
			e.preventDefault();
			e.stopPropagation();
			$('.dropdown-submenu.open').removeClass('open');
			$(e.target.parentElement).addClass('open');
		},
		isVisible(entry) {
			if (this.selectedItem == null) {
				return false;
			} else if (entry.type && entry.type !== this.selectedItem.type) {
				return false;
			} else if (entry.shown) {
				return entry.shown(this.selectedItem);
			} else if (entry.children) {
				if (typeof entry.children === 'function') {
					return !_.isEmpty(entry.children(this.selectedItem));
				}
				return entry.children.some(el => el.shown ? el.shown(this.selectedItem) : true);
			}
			return true;
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
				openFileHandler('.lic', 'text', app.openLicFile);
			}
		},
		{text: 'Open Recent (NYI)', enabled: () => false, cb: () => {}},
		{
			text: 'Close',
			enabled: enableIfModel,
			cb: 'closeModel'
		},
		{
			text: 'Save',
			shortcut: 'ctrl+s',
			enabled: enableIfModel,
			cb: 'save'
		},
		{text: 'separator'},
		{
			text: 'Import Custom Model...',
			cb() {
				openFileHandler('.ldr, .mpd', 'text', app.importLocalModel);
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
		{
			text: 'Template',
			enabled: enableIfModel,
			children: [
				{
					text: 'Save',
					cb() {
						store.save('file', 'template', '\t');
					}
				},
				{
					text: 'Load',
					cb() {
						openFileHandler('.lit', 'text', app.importTemplate);
					}
				},
				{text: 'Load Built-in (NYI)', enabled: false, cb() {}},
				{
					text: 'Reset',
					cb() {
						undoStack.commit('templatePage.reset', null, 'Reset Template');
						app.redrawUI(true);
					}
				}
			]
		},
		{text: 'separator'},
		{
			text: 'Clear Local Cache',
			cb() {
				window.localStorage.clear();
			}
		}
	]},
	{name: 'Edit', children: [
		{
			id: 'undo',
			text: () => 'Undo ' + undoStack.undoText(),
			shortcut: 'ctrl+z',
			enabled: undoStack.isUndoAvailable,
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
			enabled: undoStack.isRedoAvailable,
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
		{text: 'Snap To (NYI)', enabled: () => false, cb() {}},
		{text: 'Brick Colors... (NYI)', enabled: () => false, cb() {}}
	]},
	{name: 'View', children: [
		{
			text: 'Show Pages',
			enabled: enableIfModel,
			children: [
				{
					text: 'One Page',
					cb: () => app.setPageView({facingPage: false, scroll: false})
				},
				{
					text: 'Two Facing Pages (NYI)',
					enabled: false,
					cb: () => app.setPageView({facingPage: true, scroll: false})
				},
				{
					text: 'One Page Scrolling View',
					cb: () => app.setPageView({facingPage: false, scroll: true})
				},
				{
					text: 'Two Pages Scrolling View (NYI)',
					enabled: false,
					cb: () => app.setPageView({facingPage: true, scroll: true})
				}
			]
		},
		{text: 'separator'},
		{text: 'Zoom 100%', enabled: () => false, cb() {}},
		{text: 'Zoom To Fit', enabled: () => false, cb() {}},
		{text: 'Zoom In', enabled: () => false, cb() {}},
		{text: 'Zoom Out', enabled: () => false, cb() {}},
		{text: 'separator'},
		{text: 'Add Horizontal Guide', enabled: () => false, cb() {}},
		{text: 'Add Vertical Guide', enabled: () => false, cb() {}},
		{text: 'Remove Guides', enabled: () => false, cb() {}}
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
