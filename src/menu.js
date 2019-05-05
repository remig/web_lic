/* Web Lic - Copyright (C) 2019 Remi Gagne */

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
		const text = tr('action.view.grid.' + (newState ? 'show' : 'hide') + '.undo');
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
		undoStack.commit(change, null, tr('action.view.guides.add_' + orientation + '.undo'));
	};
}

function removeGuides() {
	const root = uiState.getCurrentState(), op = 'replace', path = '/guides';
	const originalGuides = _.cloneDeep(root.guides);
	const change = {
		redo: [{root, op, path, value: []}],
		undo: [{root, op, path, value: originalGuides}]
	};
	undoStack.commit(change, null, tr('action.view.guides.remove.undo'));
}

const menu = [
	{text: 'action.file.name', id: 'file', children: [
		{
			text: 'action.file.open_lic.name',
			id: 'open',
			cb() {
				openFileHandler('.lic', 'text', app.openLicFile);
			}
		},
		{
			text: 'action.file.open_lic_recent.name',
			id: 'open_recent',
			enabled: () => false,
			cb() {}
		},
		{
			text: 'action.file.close.name',
			id: 'close',
			enabled: enableIfModel,
			cb() {
				app.closeModel();
			}
		},
		{
			text: 'action.file.save.name',
			id: 'save',
			shortcut: 'ctrl+s',
			enabled: enableIfModel,
			cb() {
				app.save();
			}
		},
		{
			text: 'action.file.save_as.name',
			id: 'save_as',
			enabled: enableIfModel,
			cb() {
				app.saveAs();
			}
		},
		{text: 'separator'},
		{
			text: 'action.file.import_model.name',
			id: 'import_custom_model',
			cb() {
				openFileHandler('.ldr, .mpd', 'text', app.importCustomModel);
			}
		},
		{
			text: 'action.file.import_builtin_model.name',
			id: 'import_builtin_model',
			children: [
				{
					text: 'action.file.import_builtin_model.models.trivial',
					cb() {
						app.importBuiltInModel('trivial_model.ldr');
					}
				},
				{
					text: 'action.file.import_builtin_model.models.alligator',
					cb() {
						app.importBuiltInModel('20015 - Alligator.mpd');
					}
				},
				{
					text: 'action.file.import_builtin_model.models.xwing',
					cb() {
						app.importBuiltInModel('7140 - X-Wing Fighter.mpd');
					}
				},
				{
					text: 'action.file.import_builtin_model.models.lab',
					cb() {
						app.importBuiltInModel('6901 - Mobile Lab.mpd');
					}
				}
			]
		},
		{text: 'separator'},
		{
			text: 'action.file.template.name',
			id: 'template',
			enabled: enableIfModel,
			children: [
				{
					text: 'action.file.template.save.name',
					id: 'save_template',
					cb() {
						app.saveTemplate();
					}
				},
				{
					text: 'action.file.template.save_as.name',
					id: 'save_template_as',
					cb() {
						app.saveTemplateAs();
					}
				},
				{
					text: 'action.file.template.load.name',
					id: 'load_template',
					cb() {
						// TODO: Need to re-layout every page after loading a template
						openFileHandler('.lit', 'text', app.importTemplate);
					}
				},
				{
					text: 'action.file.template.load_builtin.name',
					id: 'load_builtin_template',
					enabled: false,
					cb() {}
				},
				{
					text: 'action.file.template.reset.name',
					id: 'reset_template',
					cb() {
						const text = tr('action.file.template.reset.undo');
						undoStack.commit('templatePage.reset', null, text, ['csi', 'pliItem']);
					}
				}
			]
		},
		{text: 'separator'},
		{
			text: 'action.file.set_language.name',
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
			text: 'action.file.clear_cache.name',
			id: 'clear_cache',
			children: [
				{
					text: 'action.file.clear_cache.model.name',
					id: 'clear_cache_model',
					cb() {
						app.closeModel();
						Storage.clear.model();
						app.redrawUI();
					}
				},
				{
					text: 'action.file.clear_cache.ui.name',
					id: 'clear_cache_ui',
					cb() {
						uiState.resetUIState();
						Storage.clear.ui();
						app.redrawUI();
					}
				},
				{
					text: 'action.file.clear_cache.everything.name',
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
	{text: 'action.edit.name', id: 'edit', children: [
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
			text: 'action.edit.title_page.add.name',
			shown: () => enableIfModel() && store.get.titlePage() == null,
			cb() {
				undoStack.commit('addTitlePage', null, tr(this.text));
				app.clearSelected();
				app.setCurrentPage({type: 'titlePage', id: 0});
			}
		},
		{
			text: 'action.edit.title_page.remove.name',
			shown: () => enableIfModel() && store.get.titlePage() != null,
			cb() {
				app.clearSelected();
				app.setCurrentPage({type: 'page', id: 0});
				undoStack.commit('removeTitlePage', null, tr(this.text));
			}
		},
		{
			text: 'action.edit.pli.show.name',
			shown: () => enableIfModel() && !store.state.plisVisible,
			cb() {
				undoStack.commit('pli.toggleVisibility', {visible: true}, tr(this.text));
			}
		},
		{
			text: 'action.edit.pli.hide.name',
			shown: () => enableIfModel() && store.state.plisVisible,
			cb() {
				undoStack.commit('pli.toggleVisibility', {visible: false}, tr(this.text));
			}
		},
		{
			text: 'action.edit.inventory_page.add.name',
			shown: () => enableIfModel() && !store.state.inventoryPages.length,
			cb() {
				app.clearSelected();
				undoStack.commit('inventoryPage.add', null, tr(this.text));
				app.setCurrentPage({type: 'inventoryPage', id: 0});
			}
		},
		{
			text: 'action.edit.inventory_page.remove.name',
			shown: () => enableIfModel() && store.state.inventoryPages.length,
			cb() {
				app.clearSelected();
				undoStack.commit('inventoryPage.deleteAll', null, tr(this.text));
				app.setCurrentPage(store.get.lastPage());
			}
		},
		{text: 'action.edit.snap.name', enabled: () => false, cb() {}},
		{
			text: 'action.edit.scene_rendering.name',
			shown: enableIfModel,
			cb() {
				DialogManager('sceneRenderingDialog', dialog => {
					dialog.show(app);
				});
			}
		},
		{
			text: 'action.edit.brick_colors.name',
			cb() {
				DialogManager('brickColorDialog');
			}
		}
	]},
	{text: 'action.view.name', id: 'view', children: [
		{
			text: 'action.view.show_pages.name',
			enabled: enableIfModel,
			children: [
				{
					text: 'action.view.show_pages.one.name',
					cb: () => app.setPageView({facingPage: false, scroll: false})
				},
				{
					text: 'action.view.show_pages.two.name',
					enabled: false,
					cb: () => app.setPageView({facingPage: true, scroll: false})
				},
				{
					text: 'action.view.show_pages.one_scroll.name',
					cb: () => app.setPageView({facingPage: false, scroll: true})
				},
				{
					text: 'action.view.show_pages.two_scroll.name',
					enabled: false,
					cb: () => app.setPageView({facingPage: true, scroll: true})
				}
			]
		},
		{
			text: 'action.view.zoom.name',
			enabled: enableIfModel,
			children: [
				{text: 'action.view.zoom.full.name', enabled: () => false, cb() {}},
				{text: 'action.view.zoom.fit.name', enabled: () => false, cb() {}},
				{text: 'action.view.zoom.in.name', enabled: () => false, cb() {}},
				{text: 'action.view.zoom.out.name', enabled: () => false, cb() {}}
			]
		},
		{
			text: 'action.view.grid.name',
			enabled: enableIfModel,
			children: [
				{
					text: 'action.view.grid.show.name',
					shown() {
						return !uiState.get('grid').enabled;
					},
					cb: toggleGrid(true)
				},
				{
					text: 'action.view.grid.hide.name',
					shown() {
						return uiState.get('grid.enabled');
					},
					cb: toggleGrid(false)
				},
				{
					text: 'action.view.grid.customize.name',
					cb() {
						DialogManager('gridDialog', dialog => {
							dialog.show(app);
						});
					}
				}
			]
		},
		{
			text: 'action.view.guides.name',
			enabled: enableIfModel,
			children: [
				{
					text: 'action.view.guides.add_horizontal.name',
					cb: addGuide('horizontal')
				},
				{
					text: 'action.view.guides.add_vertical.name',
					cb: addGuide('vertical')
				},
				{
					text: 'action.view.guides.remove.name',
					cb: removeGuides
				}
			]
		}
	]},
	{text: 'action.export.name', id: 'export', children: [
		{
			text: 'action.export.pdf.name',
			enabled: enableIfModel,
			cb() {
				InstructionExporter.generatePDF(app, store);
			}
		},
		{
			text: 'action.export.hi_res_pdf.name',
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
			text: 'action.export.png.name',
			enabled: enableIfModel,
			cb() {
				InstructionExporter.generatePNGZip(app, store);
			}
		},
		{
			text: 'action.export.hi_res_png.name',
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
