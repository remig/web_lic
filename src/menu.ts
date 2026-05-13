/* Web Lic - Copyright (C) 2019 Remi Gagne */

import _ from './util';
import * as FileOps from './file_ops';
import * as SelectionOps from './selection_ops';
import * as UiOps from './ui_ops';
import InstructionExporter from './export';
import store from './store';
import undoStack from './undo_stack';
import Storage from './storage';
import * as translate from '@/translations';
import {t} from '@/translations';
import uiState from './ui_state';
import DialogManager from './dialog';
import type {Orientations} from './item_types';
import EventBus from './event_bus';

function enableIfModel() {
	return store != null && store.model != null;
}

function toggleGrid() {
	const root = uiState.get('grid'), op = 'replace', path = '/enabled';
	const value = root.enabled;
	const change = {
		redo: [{root, op, path, value: !value}],
		undo: [{root, op, path, value}],
	};
	const text = t('action.view.grid.' + (value ? 'hide' : 'show') + '.undo');
	undoStack.commit(change, null, text);
}

function addGuide(orientation: Orientations) {
	return function() {
		const root = uiState.get('guides');
		const {width, height} = store.state.template.page;
		const position = Math.floor((orientation === 'vertical') ? (width / 2) : (height / 2));
		const change = {
			redo: [{root, op: 'add', path: '/-', value: {orientation, position}}],
			undo: [{root, op: 'remove', path: `/${root.length}`}],
		};
		undoStack.commit(change, null, t(`action.view.guides.add_${orientation}.undo`));
	};
}

function removeGuides() {
	const root = uiState.getCurrentState();
	const op = 'replace';
	const path = '/guides';
	const originalGuides = _.cloneDeep(root.guides);
	const change = {
		redo: [{root, op, path, value: []}],
		undo: [{root, op, path, value: originalGuides}],
	};
	undoStack.commit(change, null, t('action.view.guides.remove.undo'));
}

const menu = [
	{text: 'action.file.name', id: 'file_menu', children: [
		{
			text: 'action.file.open_lic.name',
			id: 'open_menu',
			cb: FileOps.openLicFile,
		},
		{
			text: 'action.file.open_lic_recent.name',
			id: 'open_recent_menu',
			enabled: () => false,
			cb() {},
		},
		{
			text: 'action.file.close.name',
			id: 'close_menu',
			enabled: enableIfModel,
			cb: FileOps.closeModel,
		},
		{
			text: 'action.file.save.name',
			id: 'save_menu',
			shortcut: 'ctrl+s',
			enabled: enableIfModel,
			cb: FileOps.save,
		},
		{
			text: 'action.file.save_as.name',
			id: 'save_as_menu',
			enabled: enableIfModel,
			cb: FileOps.saveAs,
		},
		{text: 'separator'},
		{
			text: 'action.file.import_model.name',
			id: 'import_custom_model_menu',
			cb: FileOps.importCustomModel,
		},
		{
			text: 'action.file.import_builtin_model.name',
			id: 'import_builtin_model_menu',
			children: [
				{
					text: 'action.file.import_builtin_model.models.trivial',
					id: 'import_trivial_model_menu',
					cb: () => FileOps.importBuiltInModel('trivial_model.ldr'),
				},
				{
					text: 'action.file.import_builtin_model.models.alligator',
					id: 'import_alligator_menu',
					cb: () => FileOps.importBuiltInModel('20015 - Alligator.mpd'),
				},
				{
					text: 'action.file.import_builtin_model.models.xwing',
					id: 'import_xwing_menu',
					cb: () => FileOps.importBuiltInModel('7140 - X-Wing Fighter.mpd'),
				},
				{
					text: 'action.file.import_builtin_model.models.lab',
					id: 'import_mobile_lab_menu',
					cb: () => FileOps.importBuiltInModel('6901 - Mobile Lab.mpd'),
				},
			],
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
					cb: FileOps.saveTemplate,
				},
				{
					text: 'action.file.template.save_as.name',
					id: 'save_template_as_menu',
					cb: FileOps.saveTemplateAs,
				},
				{
					text: 'action.file.template.load.name',
					id: 'load_template_menu',
					cb: FileOps.importTemplate,
				},
				{
					text: 'action.file.template.load_builtin.name',
					id: 'load_builtin_template_menu',
					enabled: false,
					cb() {},
				},
				{
					text: 'action.file.template.reset.name',
					id: 'reset_template_menu',
					cb() {
						const text = t('action.file.template.reset.undo');
						undoStack.commit('templatePage.reset', null, text, ['csi', 'pliItem']);
					},
				},
			],
		},
		{text: 'separator'},
		{
			text: 'action.file.set_language.name',
			id: 'set_language_menu',
			children() {
				return translate.LanguageList.map(language => {
					return {
						text: translate.noTranslate(language.language),
						id: `language_${language.code}_menu`,
						cb() {
							translate.setLocale(language.code);
							UiOps.redrawUI();
						},
					};
				});
			},
		},
		{
			text: 'action.file.clear_cache.name',
			id: 'clear_cache_menu',
			cb() {
				FileOps.closeModel();
				uiState.resetUIState();
				Storage.clear.everything();
				UiOps.redrawUI();
			},
		},
	]},
	{text: 'action.edit.name', id: 'edit_menu', children: [
		{
			id: 'undo_menu',
			text: undoStack.undoText,
			shortcut: 'ctrl+z',
			enabled: undoStack.isUndoAvailable,
			cb: undoStack.undo,
		},
		{
			id: 'redo_menu',
			text: undoStack.redoText,
			shortcut: 'ctrl+y',
			enabled: undoStack.isRedoAvailable,
			cb: undoStack.redo,
		},
		{text: 'separator'},
		{
			text() {
				const plural = store.state.books.length > 1;
				return `action.edit.title_page.add.name${plural ? '_plural' : ''}`;
			},
			id: 'add_title_page_menu',
			shown: () => enableIfModel() && store.get.titlePage() == null,
			cb() {
				undoStack.commit('titlePage.add', {}, t(this.text()));
				SelectionOps.setCurrentPage(store.get.firstPage());
				SelectionOps.clearSelected();
			},
		},
		{
			text() {
				const plural = store.state.books.length > 1;
				return `action.edit.title_page.remove.name${plural ? '_plural' : ''}`;
			},
			id: 'remove_title_page_menu',
			shown: () => enableIfModel() && store.get.titlePage() != null,
			cb() {
				undoStack.commit('titlePage.delete', {}, t(this.text()));
				SelectionOps.setCurrentPage(store.get.firstBasicPage());
				SelectionOps.clearSelected();
			},
		},
		{
			text: 'action.edit.pli.show.name',
			id: 'show_pli_menu',
			shown: () => enableIfModel() && !store.state.plisVisible,
			cb() {
				undoStack.commit('pli.toggleVisibility', {visible: true}, t(this.text));
			},
		},
		{
			text: 'action.edit.pli.hide.name',
			id: 'hide_pli_menu',
			shown: () => enableIfModel() && store.state.plisVisible,
			cb() {
				undoStack.commit('pli.toggleVisibility', {visible: false}, t(this.text));
			},
		},
		{
			text: 'action.edit.inventory_page.add.name',
			id: 'add_inventory_page_menu',
			shown: () => enableIfModel() && !store.get.inventoryPages().length,
			cb() {
				SelectionOps.clearSelected();
				undoStack.commit('inventoryPage.add', null, t(this.text));
				SelectionOps.setCurrentPage(store.get.inventoryPages()[0]);
			},
		},
		{
			text: 'action.edit.inventory_page.remove.name',
			id: 'hide_inventory_page_menu',
			shown: () => enableIfModel() && store.get.inventoryPages().length,
			cb() {
				SelectionOps.clearSelected();
				undoStack.commit('inventoryPage.deleteAll', null, t(this.text));
				SelectionOps.setCurrentPage(store.get.lastBasicPage());
			},
		},
		{
			text: 'action.edit.multi_book.name',
			id: 'multi_book_menu',
			shown: enableIfModel,
			cb() {
				DialogManager('multiBookDialog', dialog => {
					dialog.$on('ok', (opts: any) => {
						undoStack.commit(
							'book.divideInstructions',
							opts,
							t('action.edit.multi_book.undo'),
						);
						SelectionOps.setCurrentPage(store.get.firstPage());
					});
				});
			},
		},
		{text: 'action.edit.snap.name', id: 'edit_snap_menu', enabled: () => false, cb() {}},
		{
			text: 'action.edit.scene_rendering.name',
			id: 'scene_rendering_menu',
			shown: enableIfModel,
			cb: () => DialogManager('sceneRenderingDialog'),
		},
		{
			text: 'action.edit.brick_colors.name',
			id: 'edit_brick_colors_menu',
			cb: () => DialogManager('brickColorDialog'),
		},
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
					cb: () => EventBus.emit('set-page-view', {facingPage: false, scroll: false}),
				},
				{
					text: 'action.view.show_pages.two.name',
					id: 'show_two_pages_menu',
					enabled: false,
					cb: () => EventBus.emit('set-page-view', {facingPage: true, scroll: false}),
				},
				{
					text: 'action.view.show_pages.one_scroll.name',
					id: 'show_one_scroll_menu',
					cb: () => EventBus.emit('set-page-view', {facingPage: false, scroll: true}),
				},
				{
					text: 'action.view.show_pages.two_scroll.name',
					id: 'show_two_scroll_menu',
					enabled: false,
					cb: () => EventBus.emit('set-page-view', {facingPage: true, scroll: true}),
				},
			],
		},
		{
			text: 'action.view.zoom.name',
			id: 'zoom_menu',
			enabled: enableIfModel,
			children: [
				{text: 'action.view.zoom.full.name', id: 'zoom_full_menu', enabled: () => false, cb() {}},
				{text: 'action.view.zoom.fit.name', id: 'zoom_fit_menu', enabled: () => false, cb() {}},
				{text: 'action.view.zoom.in.name', id: 'zoom_in_menu', enabled: () => false, cb() {}},
				{text: 'action.view.zoom.out.name', id: 'zoom_out_menu', enabled: () => false, cb() {}},
			],
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
					cb: toggleGrid,
				},
				{
					text: 'action.view.grid.customize.name',
					id: 'customize_grid_menu',
					cb() {
						DialogManager('gridDialog', dialog => {
							dialog.show();
						});
					},
				},
			],
		},
		{
			text: 'action.view.guides.name',
			id: 'guides_menu',
			enabled: enableIfModel,
			children: [
				{
					text: 'action.view.guides.add_horizontal.name',
					id: 'add_h_guide_menu',
					cb: addGuide('horizontal'),
				},
				{
					text: 'action.view.guides.add_vertical.name',
					id: 'add_v_guide_menu',
					cb: addGuide('vertical'),
				},
				{
					text: 'action.view.guides.remove.name',
					id: 'remove_guide_menu',
					cb: removeGuides,
				},
			],
		},
	]},
	{text: 'action.export.name', id: 'export_menu', children: [
		{
			text: 'action.export.pdf.name',
			id: 'export_pdf_menu',
			enabled: enableIfModel,
			cb: () => InstructionExporter.generatePDF(store),
		},
		{
			text: 'action.export.hi_res_pdf.name',
			id: 'export_hi_pdf_menu',
			enabled: enableIfModel,
			cb() {
				DialogManager('pdfExportDialog', dialog => {
					dialog.$on('ok', (newValues: any) => {
						InstructionExporter.generatePDF(store, newValues);
					});
					dialog.show(store.state.template.page);
				});
			},
		},
		{
			text: 'action.export.png.name',
			id: 'export_png_menu',
			enabled: enableIfModel,
			cb: () => InstructionExporter.generatePNGZip(store),
		},
		{
			text: 'action.export.hi_res_png.name',
			id: 'export_hi_png_menu',
			enabled: enableIfModel,
			cb() {
				DialogManager('pngExportDialog', dialog => {
					dialog.$on('ok', (newValues: any) => {
						InstructionExporter.generatePNGZip(store, newValues.scale, newValues.dpi);
					});
					const pageSize = store.state.template.page;
					dialog.show({width: pageSize.width, height: pageSize.height});
				});
			},
		},
	]},
] as const;

export default function Menu() {
	return menu;
}
