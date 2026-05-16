/* Web Lic - Copyright (C) 2019 Remi Gagne */

import {nextTick} from 'vue';

import backwardCompat from './backward_compat';
import {showImportModelDialog,showMissingPartsDialog, showStringChooserDialog} from './dialog';
import openFileHandler from './file_uploader';
import LDParse from './ld_parse';
import * as SelectionOps from './selection_ops';
import Storage from './storage';
import store from './store';
import {t} from './translations';
import * as UiOps from './ui_ops';
import * as ReactiveState from './ui_reactive_state';
import undoStack from './undo_stack';
import _ from './util';

export function importBuiltInModel(url: string) {
	importModel(() => LDParse.loadRemotePart('./static/models/' + url, ReactiveState.updateProgress));
}

export function importCustomModel() {
	openFileHandler('.ldr, .mpd', 'text', (content, fn) => {
		importModel(() => LDParse.loadModelContent(content as string, fn, ReactiveState.updateProgress));
	});
}

export async function importModel(modelGenerator: () => Promise<any>) {
	const start = Date.now();
	if (store.model) {
		closeModel();
	}

	await LDParse.loadLDConfig();  // Forcefully reload color table, to clear previous color table

	ReactiveState.busyText.value = t('dialog.busy_indicator.loading_model');
	const model = await modelGenerator();

	if (!_.isEmpty(LDParse.missingParts)) {
		await showMissingPartsDialog();
	}

	await store.mutations.templatePage.add();
	store.setModel(model);
	ReactiveState.filename.value = store.state.licFilename;
	store.render.adjustCameraZoom();

	const partsPerStep = _.isEmpty(model.steps)
		? _.clamp(Math.floor(LDParse.model.get.partCount(model) / 10), 1, 20)
		: undefined;
	const layoutChoices = await showImportModelDialog({
		includePartsPerStep: partsPerStep != null,
		partsPerStep,
	});
	if (layoutChoices != null) {
		// TODO: Add option to start new page for each submodel
		store.mutations.pli.toggleVisibility({visible: layoutChoices.include.pli});
		store.mutations.addInitialPages({partsPerStep: layoutChoices.partsPerStep});
		store.mutations.addInitialSubmodelImages();
		if (layoutChoices.useMaxSteps) {
			ReactiveState.busyText.value = t('dialog.busy_indicator.merging_steps');
			store.mutations.mergeInitialPages(ReactiveState.updateProgress);
		}
		if (layoutChoices.include.partListPage) {
			store.mutations.inventoryPage.add();
		}
		if (layoutChoices.include.titlePage) {
			// Add title page after regular pages so title page labels comes out correct
			store.mutations.titlePage.add();
		}
		store.saveLocal();

		const firstPage = store.get.firstPage();
		ReactiveState.currentPageId.value = firstPage?.id ?? null;
		undoStack.saveBaseState();
		UiOps.forceUIUpdate();

		ReactiveState.updateProgress({clear: true});
		const time = _.formatTime(start, Date.now());
		const fn = store.get.modelFilename();
		const msg = t('action.file.import_model.success_message_@mf', {filename: fn, time});
		ReactiveState.statusText.value = msg;
		nextTick(UiOps.drawCurrentPage);
	}
}

export function openLicFile() {
	openFileHandler('.lic', 'text', content => openLicFileFromContent(content as string));
}

export function openLicFileFromContent(rawContent: string | object) {
	const start = Date.now();
	const content = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;

	backwardCompat.fixLicSaveFile(content);

	if (store.model) {
		closeModel();
	}
	store.load(content);
	ReactiveState.filename.value = store.state.licFilename;
	const firstPage = store.get.firstPage();
	ReactiveState.currentPageId.value = firstPage?.id ?? null;
	store.saveLocal();
	undoStack.saveBaseState();
	SelectionOps.clearSelected();
	const time = _.formatTime(start, Date.now());
	const fn = store.model!.filename;
	ReactiveState.statusText.value = t('action.file.open_lic.success_message_@mf', {filename: fn, time});
	nextTick(() => {
		UiOps.forceUIUpdate();
		UiOps.drawCurrentPage();
	});
}

export function save() {
	store.saveToFile();
	ReactiveState.dirtyState.lastSaveIndex = undoStack.getIndex();
}

export async function saveAs() {
	const newString = await showStringChooserDialog({
		title: t('dialog.save_as.title'),
		label: t('dialog.save_as.fn'),
		initialValue: ReactiveState.filename.value,
	});
	if (newString == null) {
		return;
	}
	const fn = newString.replace(/[^a-zA-Z0-9 _]/ig, '').replace(/li[ct]$/ig, '');
	ReactiveState.filename.value = store.state.licFilename = fn;
	save();
}

export function saveTemplate(templateName?: string) {
	store.saveTemplate(templateName, '\t');
}

export async function saveTemplateAs() {
	const newString = await showStringChooserDialog({
		title: t('dialog.save_template_as.title'),
		label: t('dialog.save_template_as.fn'),
		initialValue: ReactiveState.filename.value,
	});
	if (newString == null) {
		return;
	}
	const fn = newString.replace(/[^a-zA-Z0-9 _]/ig, '').replace(/li[ct]$/ig, '');
	saveTemplate(fn);
}

export function importTemplate() {
	openFileHandler('.lit', 'text', (result, fn) => {
		const content = JSON.parse(result as string);
		backwardCompat.fixLicTemplate(content);
		undoStack.commit('templatePage.load', content, 'Load Template', ['page'] as any);
		ReactiveState.statusText.value = t('action.file.template.load.success_message_@mf', {filename: fn});
		nextTick(() => {
			UiOps.forceUIUpdate();
			UiOps.drawCurrentPage();
		});
	});
}

export function closeModel() {
	store.resetState();
	undoStack.clear();
	Storage.clear.model();
	UiOps.clearState();
	store.render.clearCanvasCache();
	nextTick(() => {
		SelectionOps.clearSelected();
	});
}
