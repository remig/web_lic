/* global Vue: false, $: false */
'use strict';

import _ from './util';
import InstructionExporter from './export';
import store from './store';
import undoStack from './undoStack';
import openFileHandler from './fileUploader';
import Storage from './storage';
import LocaleManager from './translate';
import uiState from './uiState';

import DialogManager from './dialog';
import gridDialog from './dialogs/grid_dialog.vue';
import pdfExportDialog from './dialogs/export_pdf.vue';

let app;
const tr = LocaleManager.translate;

Vue.component('menu-list', {
	template: '#menuTemplate',
	props: ['menuEntries', 'selectedItem'],
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
	template: '#navMenuTemplate',
	props: ['menuEntryList', 'filename', 'version']
});

function enableIfModel() {
	return store != null && store.model != null;
}


function toggleGrid(newState) {
	return function() {
		const root = uiState.get('grid'), op = 'replace', path = '/enabled';
		const change = {
			action: {
				redo: [{root, op, path, value: newState}],
				undo: [{root, op, path, value: !newState}]
			}
		};
		undoStack.commit(change, null, tr('navbar.view.grid.show_hide_undo'));
	};
}

function addGuide(orientation) {
	return function() {
		const root = uiState.get('guides');
		const pageSize = store.state.template.page;
		const position = Math.floor((orientation === 'vertical') ? (pageSize.width / 2) : (pageSize.height / 2));
		const change = {
			action: {
				redo: [{root, op: 'add', path: '/-', value: {orientation, position}}],
				undo: [{root, op: 'remove', path: `/${root.length}`}]
			}
		};
		undoStack.commit(change, null, tr('navbar.view.guides.add_undo'));
	};
}

function removeGuides() {
	const root = uiState.getCurrentState(), op = 'replace', path = '/guides';
	const originalGuides = _.clone(root.guides);
	const change = {
		action: {
			redo: [{root, op, path, value: []}],
			undo: [{root, op, path, value: originalGuides}]
		}
	};
	undoStack.commit(change, null, tr('navbar.view.guides.remove_undo'));
}

const menu = [
	{text: 'navbar.file.root', children: [
		{
			text: 'navbar.file.open_lic',
			id: 'open',
			cb() {
				openFileHandler('.lic', 'text', app.openLicFile);
			}
		},
		{text: 'navbar.file.open_lic_recent', enabled: () => false, cb: () => {}},
		{
			text: 'navbar.file.close',
			enabled: enableIfModel,
			cb: 'closeModel'
		},
		{
			text: 'navbar.file.save',
			shortcut: 'ctrl+s',
			enabled: enableIfModel,
			cb: 'save'
		},
		{text: 'separator'},
		{
			text: 'navbar.file.import_model',
			cb() {
				openFileHandler('.ldr, .mpd', 'text', app.importLocalModel);
			}
		},
		{
			text: 'navbar.file.import_builtin_model',
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
			text: 'navbar.file.template.root',
			enabled: enableIfModel,
			children: [
				{
					text: 'navbar.file.template.save',
					cb() {
						store.save('file', 'template', '\t');
					}
				},
				{
					text: 'navbar.file.template.load',
					cb() {
						openFileHandler('.lit', 'text', app.importTemplate);
					}
				},
				{text: 'navbar.file.template.load_builtin', enabled: false, cb() {}},
				{
					text: 'navbar.file.template.reset',
					cb() {
						const text = tr('navbar.file.template.reset_undo');
						undoStack.commit('templatePage.reset', null, text, ['csi', 'pliItem']);
					}
				}
			]
		},
		{text: 'separator'},
		{
			text: 'navbar.file.set_language.root',
			children() {
				return LocaleManager.LanguageList.map(language => {
					return {
						text: language.language,
						cb() {
							LocaleManager.setLocale(language.code);
							app.redrawUI();
						}
					};
				});
			}
		},
		{
			text: 'navbar.file.clear_cache.root',
			children: [
				{
					text: 'navbar.file.clear_cache.model',
					cb() {
						app.closeModel();
						Storage.clear.model();
						app.redrawUI();
					}
				},
				{
					text: 'navbar.file.clear_cache.ui',
					cb() {
						uiState.resetUIState();
						Storage.clear.ui();
						app.redrawUI();
					}
				},
				{
					text: 'navbar.file.clear_cache.everything',
					cb() {
						app.closeModel();
						uiState.resetUIState();
						Storage.clear.everything();
						app.redrawUI();
					}
				}
			]
		}
	]},
	{text: 'navbar.edit.root', children: [
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
			text: 'navbar.edit.title_page.add',
			shown: () => enableIfModel() && store.get.titlePage() == null,
			cb() {
				undoStack.commit('addTitlePage', null, tr(this.text));
				app.clearSelected();
				app.setCurrentPage({type: 'titlePage', id: 0});
			}
		},
		{
			text: 'navbar.edit.title_page.remove',
			shown: () => enableIfModel() && store.get.titlePage() != null,
			cb() {
				app.clearSelected();
				app.setCurrentPage({type: 'page', id: 0});
				undoStack.commit('removeTitlePage', null, tr(this.text));
			}
		},
		{
			text: 'navbar.edit.pli.show',
			shown: () => enableIfModel() && !store.state.plisVisible,
			cb() {
				undoStack.commit('pli.toggleVisibility', {visible: true}, tr(this.text));
			}
		},
		{
			text: 'navbar.edit.pli.hide',
			shown: () => enableIfModel() && store.state.plisVisible,
			cb() {
				undoStack.commit('pli.toggleVisibility', {visible: false}, tr(this.text));
			}
		},
		{text: 'navbar.edit.snap', enabled: () => false, cb() {}},
		{text: 'navbar.edit.brick_colors', enabled: () => false, cb() {}}
	]},
	{text: 'navbar.view.root', children: [
		{
			text: 'navbar.view.show_pages.root',
			enabled: enableIfModel,
			children: [
				{
					text: 'navbar.view.show_pages.one',
					cb: () => app.setPageView({facingPage: false, scroll: false})
				},
				{
					text: 'navbar.view.show_pages.two',
					enabled: false,
					cb: () => app.setPageView({facingPage: true, scroll: false})
				},
				{
					text: 'navbar.view.show_pages.one_scroll',
					cb: () => app.setPageView({facingPage: false, scroll: true})
				},
				{
					text: 'navbar.view.show_pages.two_scroll',
					enabled: false,
					cb: () => app.setPageView({facingPage: true, scroll: true})
				}
			]
		},
		{
			text: 'navbar.view.zoom.root',
			enabled: enableIfModel,
			children: [
				{text: '100%', enabled: () => false, cb() {}},
				{text: 'To Fit', enabled: () => false, cb() {}},
				{text: 'In', enabled: () => false, cb() {}},
				{text: 'Out', enabled: () => false, cb() {}}
			]
		},
		{
			text: 'navbar.view.grid.root',
			enabled: enableIfModel,
			children: [
				{
					text: 'navbar.view.grid.show',
					shown() {
						return !uiState.get('grid').enabled;
					},
					cb: toggleGrid(true)
				},
				{
					text: 'navbar.view.grid.hide',
					shown() {
						return uiState.get('grid.enabled');
					},
					cb: toggleGrid(false)
				},
				{
					text: 'navbar.view.grid.customize',
					cb() {
						DialogManager.setDialog(gridDialog);
						Vue.nextTick(() => {
							DialogManager.getDialog().show(app);
						});
					}
				}
			]
		},
		{
			text: 'navbar.view.guides.root',
			enabled: enableIfModel,
			children: [
				{
					text: 'navbar.view.guides.add_horizontal',
					cb: addGuide('horizontal')
				},
				{
					text: 'navbar.view.guides.add_vertical',
					cb: addGuide('vertical')
				},
				{
					text: 'navbar.view.guides.remove',
					cb: removeGuides
				}
			]
		}
	]},
	{text: 'navbar.export.root', children: [
		{
			text: 'navbar.export.pdf',
			enabled: enableIfModel,
			cb() {
				InstructionExporter.generatePDF(app, store);
			}
		},
		{
			text: 'navbar.export.hi_res_pdf',
			enabled: enableIfModel,
			cb() {
				DialogManager.setDialog(pdfExportDialog);
				Vue.nextTick(() => {
					const dialog = DialogManager.getDialog();
					dialog.$on('ok', newValues => {
						InstructionExporter.generatePDF(app, store, newValues);
					});
					dialog.show(store.state.template.page);
				});
			}
		},
		{
			text: 'navbar.export.png',
			enabled: enableIfModel,
			cb() {
				InstructionExporter.generatePNGZip(app, store);
			}
		},
		{
			text: 'navbar.export.hi_res_png',
			enabled: enableIfModel,
			cb() {

				const originalScale = uiState.get('dialog.export.images.scale');
				const pageSize = store.state.template.page;
				function sizeText(scale) {
					const size = {
						width: Math.floor(pageSize.width * scale),
						height: Math.floor(pageSize.height * scale)
					};
					return tr('dialog.scale_images.image_size_@mf', size);
				}
				DialogManager.setDialog('numberChooserDialog');

				Vue.nextTick(() => {
					const dialog = DialogManager.getDialog();
					dialog.$on('update', newValues => {
						dialog.bodyText = sizeText(newValues.value);
					});
					dialog.$on('ok', newValues => {
						uiState.get('dialog.export.images').scale = newValues.value;
						InstructionExporter.generatePNGZip(app, store, newValues.value);
					});
					dialog.visible = true;
					dialog.title = tr('dialog.scale_images.title');
					dialog.bodyText = sizeText(originalScale);
					dialog.value = originalScale;
				});
			}
		}
	]}
];

export default function Menu(localApp) {
	app = localApp;
	return menu;
}
