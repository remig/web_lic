/* global Vue: false, $: false */
'use strict';

import _ from './util';
import {translate as tr} from './translate';
import InstructionExporter from './export';
import store from './store';
import undoStack from './undoStack';
import openFileHandler from './fileUploader';

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
			} else if (entry.selectedItem && entry.selectedItem.type !== this.selectedItem.type) {
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
	{name: tr('navbar.file.root'), children: [
		{
			text: tr('navbar.file.open_lic'),
			id: 'open',
			cb() {
				openFileHandler('.lic', 'text', app.openLicFile);
			}
		},
		{text: tr('navbar.file.open_lic_recent'), enabled: () => false, cb: () => {}},
		{
			text: tr('navbar.file.close'),
			enabled: enableIfModel,
			cb: 'closeModel'
		},
		{
			text: tr('navbar.file.save'),
			shortcut: 'ctrl+s',
			enabled: enableIfModel,
			cb: 'save'
		},
		{text: 'separator'},
		{
			text: tr('navbar.file.import_model'),
			cb() {
				openFileHandler('.ldr, .mpd', 'text', app.importLocalModel);
			}
		},
		{
			text: tr('navbar.file.import_builtin_model'),
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
			text: tr('navbar.file.template.root'),
			enabled: enableIfModel,
			children: [
				{
					text: tr('navbar.file.template.save'),
					cb() {
						store.save('file', 'template', '\t');
					}
				},
				{
					text: tr('navbar.file.template.load'),
					cb() {
						openFileHandler('.lit', 'text', app.importTemplate);
					}
				},
				{text: tr('navbar.file.template.load_builtin'), enabled: false, cb() {}},
				{
					text: tr('navbar.file.template.reset'),
					cb() {
						undoStack.commit('templatePage.reset', null, 'Reset Template');
					}
				}
			]
		},
		{text: 'separator'},
		{
			text: tr('navbar.file.clear_cache'),
			cb() {
				window.localStorage.clear();
			}
		}
	]},
	{name: tr('navbar.edit.root'), children: [
		{
			id: 'undo',
			text: undoStack.undoText,
			shortcut: 'ctrl+z',
			enabled: undoStack.isUndoAvailable,
			cb: undoStack.undo
		},
		{
			id: 'redo',
			text: undoStack.redoText,
			shortcut: 'ctrl+y',
			enabled: undoStack.isRedoAvailable,
			cb: undoStack.redo
		},
		{text: 'separator'},
		{
			text: tr('navbar.edit.title_page.add'),
			shown: () => enableIfModel() && store.get.titlePage() == null,
			cb() {
				undoStack.commit('addTitlePage', null, this.text);
				app.setCurrentPage({type: 'titlePage', id: 0});
			}
		},
		{
			text: tr('navbar.edit.title_page.remove'),
			shown: () => enableIfModel() && store.get.titlePage() != null,
			cb() {
				app.setCurrentPage({type: 'page', id: 0});
				undoStack.commit('removeTitlePage', null, this.text);
			}
		},
		{
			text: tr('navbar.edit.pli.show'),
			shown: () => enableIfModel() && !store.state.plisVisible,
			cb() {
				undoStack.commit('pli.toggleVisibility', {visible: true}, this.text);
			}
		},
		{
			text: tr('navbar.edit.pli.hide'),
			shown: () => enableIfModel() && store.state.plisVisible,
			cb() {
				undoStack.commit('pli.toggleVisibility', {visible: false}, this.text);
			}
		},
		{text: tr('navbar.edit.snap'), enabled: () => false, cb() {}},
		{text: tr('navbar.edit.brick_colors'), enabled: () => false, cb() {}}
	]},
	{name: tr('navbar.view.root'), children: [
		{
			text: tr('navbar.view.show_pages.root'),
			enabled: enableIfModel,
			children: [
				{
					text: tr('navbar.view.show_pages.one'),
					cb: () => app.setPageView({facingPage: false, scroll: false})
				},
				{
					text: tr('navbar.view.show_pages.two'),
					enabled: false,
					cb: () => app.setPageView({facingPage: true, scroll: false})
				},
				{
					text: tr('navbar.view.show_pages.one_scroll'),
					cb: () => app.setPageView({facingPage: false, scroll: true})
				},
				{
					text: tr('navbar.view.show_pages.two_scroll'),
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
	{name: tr('navbar.export.root'), children: [
		{
			text: tr('navbar.export.pdf'),
			enabled: enableIfModel,
			cb() {
				InstructionExporter.generatePDF(app, store);
			}
		},
		{
			text: tr('navbar.export.png'),
			enabled: enableIfModel,
			cb() {
				InstructionExporter.generatePNGZip(app, store);
			}
		}
	]}
];

export default function Menu(localApp) {
	app = localApp;
	return menu;
}
