/* Web Lic - Copyright (C) 2019 Remi Gagne */

import _ from './util';
import InstructionExporter from './export';
import store from './store';
import undoStack from './undo_stack';
import Storage from './storage';
import LocaleManager from './components/translate.vue';
import uiState from './ui_state';
import DialogManager from './dialog';

let app;
const tr = LocaleManager.translate;

function enableIfModel() {
	return store != null && store.model != null;
}

function toggleGrid() {
	const root = uiState.get('grid'), op = 'replace', path = '/enabled';
	const value = root.enabled;
	const change = {
		redo: [{root, op, path, value: !value}],
		undo: [{root, op, path, value}]
	};
	const text = tr('action.view.grid.' + (value ? 'hide' : 'show') + '.undo');
	undoStack.commit(change, null, text);
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
	{text: 'action.file.name', id: 'file_menu', children: [
		{
			text: 'action.file.open_lic.name',
			id: 'open_menu',
			cb: () => app.openLicFile()
		},
		{
			text: 'action.file.open_lic_recent.name',
			id: 'open_recent_menu',
			enabled: () => false,
			cb() {}
		},
		{
			text: 'action.file.close.name',
			id: 'close_menu',
			enabled: enableIfModel,
			cb: () => app.closeModel()
		},
		{
			text: 'action.file.save.name',
			id: 'save_menu',
			shortcut: 'ctrl+s',
			enabled: enableIfModel,
			cb: () => app.save()
		},
		{
			text: 'action.file.save_as.name',
			id: 'save_as_menu',
			enabled: enableIfModel,
			cb: () => app.saveAs()
		},
		{text: 'separator'},
		{
			text: 'action.file.import_model.name',
			id: 'import_custom_model_menu',
			cb: () => app.importCustomModel()
		},
		{
			text: 'action.file.import_builtin_model.name',
			id: 'import_builtin_model_menu',
			children: [
				{
					text: 'action.file.import_builtin_model.models.trivial',
					id: 'import_trivial_model_menu',
					cb: () => app.importBuiltInModel('trivial_model.ldr')
				},
				{
					text: 'action.file.import_builtin_model.models.alligator',
					id: 'import_alligator_menu',
					cb: () => app.importBuiltInModel('20015 - Alligator.mpd')
				},
				{
					text: 'action.file.import_builtin_model.models.xwing',
					id: 'import_xwing_menu',
					cb: () => app.importBuiltInModel('7140 - X-Wing Fighter.mpd')
				},
				{
					text: 'action.file.import_builtin_model.models.lab',
					id: 'import_mobile_lab_menu',
					cb: () => app.importBuiltInModel('6901 - Mobile Lab.mpd')
				}
			]
		},
		{text: 'separator'},
		{
			text: 'action.file.template.name',
			id: 'template_menu',
			enabled: enableIfModel,
			children: [
				{
					text: 'action.file.template.save.name',
					id: 'save_template_menu',
					cb: () => app.saveTemplate()
				},
				{
					text: 'action.file.template.save_as.name',
					id: 'save_template_as_menu',
					cb: () => app.saveTemplateAs()
				},
				{
					text: 'action.file.template.load.name',
					id: 'load_template_menu',
					cb: () => app.importTemplate()
				},
				{
					text: 'action.file.template.load_builtin.name',
					id: 'load_builtin_template_menu',
					enabled: false,
					cb() {}
				},
				{
					text: 'action.file.template.reset.name',
					id: 'reset_template_menu',
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
			id: 'set_language_menu',
			children() {
				return LocaleManager.LanguageList.map(language => {
					return {
						text: LocaleManager.noTranslate(language.language),
						id: `language_${language.code}_menu`,
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
			id: 'clear_cache_menu',
			cb() {
				app.closeModel();
				uiState.resetUIState();
				Storage.clear.everything();
				app.redrawUI();
			}
		}
	]},
	{text: 'action.edit.name', id: 'edit_menu', children: [
		{
			id: 'undo_menu',
			text: undoStack.undoText,
			shortcut: 'ctrl+z',
			enabled: undoStack.isUndoAvailable,
			cb: undoStack.undo
		},
		{
			id: 'redo_menu',
			text: undoStack.redoText,
			shortcut: 'ctrl+y',
			enabled: undoStack.isRedoAvailable,
			cb: undoStack.redo
		},
		{text: 'separator'},
		{
			text: 'action.edit.title_page.add.name',
			id: 'add_title_page_menu',
			shown: () => enableIfModel() && store.get.titlePage() == null,
			cb() {
				undoStack.commit('addTitlePage', null, tr(this.text));
				app.clearSelected();
				app.setCurrentPage(store.get.titlePage());
			}
		},
		{
			text: 'action.edit.title_page.remove.name',
			id: 'remove_title_page_menu',
			shown: () => enableIfModel() && store.get.titlePage() != null,
			cb() {
				undoStack.commit('removeTitlePage', null, tr(this.text));
				app.clearSelected();
				app.setCurrentPage(store.get.firstBasicPage());
			}
		},
		{
			text: 'action.edit.pli.show.name',
			id: 'show_pli_menu',
			shown: () => enableIfModel() && !store.state.plisVisible,
			cb() {
				undoStack.commit('pli.toggleVisibility', {visible: true}, tr(this.text));
			}
		},
		{
			text: 'action.edit.pli.hide.name',
			id: 'hide_pli_menu',
			shown: () => enableIfModel() && store.state.plisVisible,
			cb() {
				undoStack.commit('pli.toggleVisibility', {visible: false}, tr(this.text));
			}
		},
		{
			text: 'action.edit.inventory_page.add.name',
			id: 'add_inventory_page_menu',
			shown: () => enableIfModel() && !store.get.inventoryPages().length,
			cb() {
				app.clearSelected();
				undoStack.commit('inventoryPage.add', null, tr(this.text));
				app.setCurrentPage(store.get.inventoryPages()[0]);
			}
		},
		{
			text: 'action.edit.inventory_page.remove.name',
			id: 'hide_inventory_page_menu',
			shown: () => enableIfModel() && store.get.inventoryPages().length,
			cb() {
				app.clearSelected();
				undoStack.commit('inventoryPage.deleteAll', null, tr(this.text));
				app.setCurrentPage(store.get.lastBasicPage());
			}
		},
		{
			text: 'action.edit.multi_book.name',
			id: 'multi_book_menu',
			shown: enableIfModel,
			cb() {
				DialogManager('multiBookDialog', dialog => {
					dialog.$on('ok', opts => {
						undoStack.commit(
							'book.divideInstructions',
							opts,
							tr('action.edit.multi_book.undo')
						);
						app.setCurrentPage(store.get.titlePage());
					});
				});
			}
		},
		{text: 'action.edit.snap.name', id: 'edit_snap_menu', enabled: () => false, cb() {}},
		{
			text: 'action.edit.scene_rendering.name',
			id: 'scene_rendering_menu',
			shown: enableIfModel,
			cb() {
				DialogManager('sceneRenderingDialog', dialog => {
					dialog.show(app);
				});
			}
		},
		{
			text: 'action.edit.brick_colors.name',
			id: 'edit_brick_colors_menu',
			cb: () => DialogManager('brickColorDialog')
		}
	]},
	{text: 'action.view.name', id: 'view_menu', children: [
		{
			text: 'action.view.show_pages.name',
			id: 'show_pages_menu',
			enabled: enableIfModel,
			children: [
				{
					text: 'action.view.show_pages.one.name',
					id: 'show_one_page_menu',
					cb: () => app.setPageView({facingPage: false, scroll: false})
				},
				{
					text: 'action.view.show_pages.two.name',
					id: 'show_two_pages_menu',
					enabled: false,
					cb: () => app.setPageView({facingPage: true, scroll: false})
				},
				{
					text: 'action.view.show_pages.one_scroll.name',
					id: 'show_one_scroll_menu',
					cb: () => app.setPageView({facingPage: false, scroll: true})
				},
				{
					text: 'action.view.show_pages.two_scroll.name',
					id: 'show_two_scroll_menu',
					enabled: false,
					cb: () => app.setPageView({facingPage: true, scroll: true})
				}
			]
		},
		{
			text: 'action.view.zoom.name',
			id: 'zoom_menu',
			enabled: enableIfModel,
			children: [
				{text: 'action.view.zoom.full.name', id: 'zoom_full_menu', enabled: () => false, cb() {}},
				{text: 'action.view.zoom.fit.name', id: 'zoom_fit_menu', enabled: () => false, cb() {}},
				{text: 'action.view.zoom.in.name', id: 'zoom_in_menu', enabled: () => false, cb() {}},
				{text: 'action.view.zoom.out.name', id: 'zoom_out_menu', enabled: () => false, cb() {}}
			]
		},
		{
			text: 'action.view.grid.name',
			id: 'grid_menu',
			enabled: enableIfModel,
			children: [
				{
					text() {
						return uiState.get('grid.enabled')
							? 'action.view.grid.hide.name'
							: 'action.view.grid.show.name';
					},
					id: 'grid_show_hide_menu',
					cb: toggleGrid
				},
				{
					text: 'action.view.grid.customize.name',
					id: 'customize_grid_menu',
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
			id: 'guides_menu',
			enabled: enableIfModel,
			children: [
				{
					text: 'action.view.guides.add_horizontal.name',
					id: 'add_h_guide_menu',
					cb: addGuide('horizontal')
				},
				{
					text: 'action.view.guides.add_vertical.name',
					id: 'add_v_guide_menu',
					cb: addGuide('vertical')
				},
				{
					text: 'action.view.guides.remove.name',
					id: 'remove_guide_menu',
					cb: removeGuides
				}
			]
		}
	]},
	{text: 'action.export.name', id: 'export_menu', children: [
		{
			text: 'action.export.pdf.name',
			id: 'export_pdf_menu',
			enabled: enableIfModel,
			cb: () => InstructionExporter.generatePDF(app, store)
		},
		{
			text: 'action.export.hi_res_pdf.name',
			id: 'export_hi_pdf_menu',
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
			id: 'export_png_menu',
			enabled: enableIfModel,
			cb: () => InstructionExporter.generatePNGZip(app, store)
		},
		{
			text: 'action.export.hi_res_png.name',
			id: 'export_hi_png_menu',
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
