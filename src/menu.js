/* Web Lic - Copyright (C) 2018 Remi Gagne */

/* global Vue: false */
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

let app;
const tr = LocaleManager.translate;

function hideSubMenus() {
	document.querySelectorAll('.dropdown-submenu.open').forEach(el => {
		el.classList.remove('open');
	});
}

// TODO: Add checkbox to 'selected' menu entries, like the currently selected view entry
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
			hideSubMenus();
			const target = e.target.parentElement;
			target.classList.add('open');

			// If submenu can't fit on the right, show it on the left
			const menuBox = target.getBoundingClientRect();
			const submenu = target.querySelector('ul');
			const submenuRightEdge = menuBox.x + menuBox.width + submenu.clientWidth;
			if (submenuRightEdge > document.documentElement.clientWidth - 20) {
				submenu.style.left = 'unset';
				submenu.style.right = '100%';
			} else {
				submenu.style.left = '100%';
				submenu.style.right = 'unset';
			}
			const submenuBottomEdge = menuBox.y + submenu.clientHeight;
			if (submenuBottomEdge > document.documentElement.clientHeight - 20) {
				const dy = document.documentElement.clientHeight - submenuBottomEdge - 10;
				submenu.style['margin-top'] = dy + 'px';
			} else {
				submenu.style.removeProperty('margin-top');
			}
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
			const menu = document.getElementById('contextMenu');
			menu.style['outline-style'] = 'none';
			menu.style.display = 'block';
			menu.focus();
			Vue.nextTick(() => this.position(e));
		},
		position(e) {
			const menu = document.getElementById('contextMenu');
			const doc = document.documentElement;
			menu.style.left = Math.min(e.pageX, doc.clientWidth - menu.clientWidth - 10) + 'px';
			menu.style.top = Math.min(e.pageY, doc.clientHeight - menu.clientHeight - 10) + 'px';
		},
		hide() {
			hideSubMenus();
			document.getElementById('contextMenu').style.display = 'none';
		}
	}
});

Vue.component('nav-menu', {
	template: '#navMenuTemplate',
	props: ['menuEntryList', 'filename', 'version'],
	methods: {
		hide() {
			hideSubMenus();
			document.querySelectorAll('.dropdown.open').forEach(el => {
				el.classList.remove('open');
			});
		},
		triggerMenu(e) {
			app.closeMenus();
			e.target.parentElement.classList.add('open');
		}
	}
});

function enableIfModel() {
	return store != null && store.model != null;
}


function toggleGrid(newState) {
	return function() {
		const root = uiState.get('grid'), op = 'replace', path = '/enabled';
		const change = {
			redo: [{root, op, path, value: newState}],
			undo: [{root, op, path, value: !newState}]
		};
		const text = tr('navbar.view.grid.' + (newState ? 'show_undo' : 'hide_undo'));
		undoStack.commit(change, null, text);
	};
}

function addGuide(orientation) {
	return function() {
		const root = uiState.get('guides');
		const {width, height} = store.state.template.page;
		const position = Math.floor((orientation === 'vertical') ? (width / 2) : (height / 2));
		const change = {
			redo: [{root, op: 'add', path: '/-', value: {orientation, position}}],
			undo: [{root, op: 'remove', path: `/${root.length}`}]
		};
		undoStack.commit(change, null, tr('navbar.view.guides.add_undo'));
	};
}

function removeGuides() {
	const root = uiState.getCurrentState(), op = 'replace', path = '/guides';
	const originalGuides = _.cloneDeep(root.guides);
	const change = {
		redo: [{root, op, path, value: []}],
		undo: [{root, op, path, value: originalGuides}]
	};
	undoStack.commit(change, null, tr('navbar.view.guides.remove_undo'));
}

const menu = [
	{text: 'navbar.file.root', id: 'file', children: [
		{
			text: 'navbar.file.open_lic',
			id: 'open',
			cb() {
				openFileHandler('.lic', 'text', app.openLicFile);
			}
		},
		{
			text: 'navbar.file.open_lic_recent',
			id: 'open_recent',
			enabled: () => false,
			cb: () => {}
		},
		{
			text: 'navbar.file.close',
			id: 'close',
			enabled: enableIfModel,
			cb: 'closeModel'
		},
		{
			text: 'navbar.file.save',
			id: 'save',
			shortcut: 'ctrl+s',
			enabled: enableIfModel,
			cb: 'save'
		},
		{
			text: 'navbar.file.save_as',
			id: 'save_as',
			enabled: enableIfModel,
			cb: 'saveAs'
		},
		{text: 'separator'},
		{
			text: 'navbar.file.import_model',
			id: 'import_custom_model',
			cb() {
				openFileHandler('.ldr, .mpd', 'text', app.importCustomModel);
			}
		},
		{
			text: 'navbar.file.import_builtin_model',
			id: 'import_builtin_model',
			children: [
				{
					text: 'Trivial Model',
					cb() {
						app.importBuiltInModel('trivial_model.ldr');
					}
				},
				{
					text: 'Creator Alligator',
					cb() {
						app.importBuiltInModel('Creator/20015 - Alligator.mpd');
					}
				},
				{
					text: 'X-Wing',
					cb() {
						app.importBuiltInModel('Star Wars/7140 - X-Wing Fighter.mpd');
					}
				},
				{
					text: 'Mobile Lab',
					cb() {
						app.importBuiltInModel('Space/6901 - Mobile Lab.mpd');
					}
				}
			]
		},
		{text: 'separator'},
		{
			text: 'navbar.file.template.root',
			id: 'template',
			enabled: enableIfModel,
			children: [
				{
					text: 'navbar.file.template.save',
					id: 'save_template',
					cb: 'saveTemplate'
				},
				{
					text: 'navbar.file.template.save_as',
					id: 'save_template_as',
					cb: 'saveTemplateAs'
				},
				{
					text: 'navbar.file.template.load',
					id: 'load_template',
					cb() {
						// TODO: Need to re-layout every page after loading a template
						openFileHandler('.lit', 'text', app.importTemplate);
					}
				},
				{
					text: 'navbar.file.template.load_builtin',
					id: 'load_builtin_template',
					enabled: false,
					cb() {}
				},
				{
					text: 'navbar.file.template.reset',
					id: 'reset_template',
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
			id: 'set_language',
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
			id: 'clear_cache',
			children: [
				{
					text: 'navbar.file.clear_cache.model',
					id: 'clear_cache_model',
					cb() {
						app.closeModel();
						Storage.clear.model();
						app.redrawUI();
					}
				},
				{
					text: 'navbar.file.clear_cache.ui',
					id: 'clear_cache_ui',
					cb() {
						uiState.resetUIState();
						Storage.clear.ui();
						app.redrawUI();
					}
				},
				{
					text: 'navbar.file.clear_cache.everything',
					id: 'clear_cache_everything',
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
	{text: 'navbar.edit.root', id: 'edit', children: [
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
		{
			text: 'navbar.edit.inventory_page.add',
			shown: () => enableIfModel() && !store.state.inventoryPages.length,
			cb() {
				app.clearSelected();
				undoStack.commit('inventoryPage.add', null, tr(this.text));
				app.setCurrentPage({type: 'inventoryPage', id: 0});
			}
		},
		{
			text: 'navbar.edit.inventory_page.remove',
			shown: () => enableIfModel() && store.state.inventoryPages.length,
			cb() {
				app.clearSelected();
				undoStack.commit('inventoryPage.deleteAll', null, tr(this.text));
				app.setCurrentPage(store.get.lastPage());
			}
		},
		{text: 'navbar.edit.snap', enabled: () => false, cb() {}},
		{
			text: 'navbar.edit.scene_rendering',
			shown: enableIfModel,
			cb() {
				DialogManager('sceneRenderingDialog', dialog => {
					dialog.show(app);
				});
			}
		},
		{
			text: 'navbar.edit.brick_colors',
			cb() {
				DialogManager('brickColorDialog', dialog => {
					dialog.show();
				});
			}
		}
	]},
	{text: 'navbar.view.root', id: 'view', children: [
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
						DialogManager('gridDialog', dialog => {
							dialog.show(app);
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
	{text: 'navbar.export.root', id: 'export', children: [
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
				DialogManager('pdfExportDialog', dialog => {
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
				DialogManager('pngExportDialog', dialog => {
					dialog.$on('ok', newValues => {
						InstructionExporter.generatePNGZip(app, store, newValues.scale, newValues.dpi);
					});
					const pageSize = store.state.template.page;
					dialog.show({width: pageSize.width, height: pageSize.height});
				});
			}
		}
	]}
];

export default function Menu(localApp) {
	app = localApp;
	return menu;
}
