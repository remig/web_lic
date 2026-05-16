/* Web Lic - Copyright (C) 2018 Remi Gagne */

import { saveAs } from 'file-saver';

import packageInfo from '../package.json';
import cache from './cache';
import { type Model, type SaveFileContent, type StateInterface } from './item_types';
import LDParse from './ld_parse';
import LDRender from './ld_render';
import Storage from './storage';
import { Getters } from './store/getters';
import { Mutations } from './store/mutations';
import { Renderer } from './store/render';
import defaultTemplate from './template';
import _ from './util';

const emptyState = {
	annotations: [],
	books: [],
	calloutArrows: [],
	callouts: [],
	csis: [],
	dividers: [],
	licFilename: null, // user-visible filename (without extension) used to load / save lic file
	numberLabels: [],
	pages: [],
	pliItems: [],
	pliTransforms: {},
	plis: [],
	plisVisible: true,
	points: [],
	quantityLabels: [],
	rotateIcons: [],
	steps: [],
	submodelImages: [],
	template: _.cloneDeep(defaultTemplate),
};

export const store = {
	version: null as string | null, // The version of Lic that created this state

	// The currently loaded LDraw model, as returned from LDParse
	model: null as Model | null, // Not in state because it is saved separately, and not affected by undo / redo
	setModel(model: Model): void {
		store.model = model;
		LDRender.setModel(model);
		store.state.licFilename = store.get.modelFilenameBase();
	},
	// Stores anything that must work with undo / redo, and all state that is saved to the binary .lic,
	//  except static stuff in model, like part geometries
	state: _.cloneDeep(emptyState) as StateInterface,
	replaceState(state: any): void {
		store.state = state;
		cache.reset();
	},
	resetState(): void {
		if (store.model) {
			delete LDParse.partDictionary[store.model.filename];
		}
		store.model = null;
		store.state = _.cloneDeep(emptyState);
		cache.reset();
	},
	load(content: SaveFileContent): void {
		LDParse.setPartDictionary(content.partDictionary);
		LDParse.setColorTable(content.colorTable);
		store.model = LDParse.partDictionary[content.modelFilename];
		LDRender.setModel(LDParse.partDictionary[content.modelFilename]);
		LDRender.setRenderState(content.state.template.sceneRendering);
		store.replaceState(content.state);
	},
	saveLocal(): void {
		const content = getSaveContent();
		console.log('Updating local storage'); // eslint-disable-line no-console
		Storage.replace.model(content);
	},
	saveToFile(filename?: string, jsonIndent?: string | number): void {
		const content = getSaveContent();
		filename = (filename || store.state.licFilename || 'filename') + '.lic';
		saveJSON(content, filename, jsonIndent);
	},
	saveTemplate(filename?: string, jsonIndent?: string | number): void {
		const content = {
			version: packageInfo.version,
			template: store.state.template,
		};
		filename = (filename || store.state.licFilename || 'filename') + '.lit';
		saveJSON(content, filename, jsonIndent);
	},
	render: Renderer,
	get: Getters,
	mutations: Mutations,
};

export type Store = typeof store;

function getSaveContent(): SaveFileContent {
	return {
		version: packageInfo.version,
		partDictionary: LDParse.partDictionary,
		colorTable: LDParse.colorTable,
		modelFilename: store?.model?.filename ?? '',
		state: store.state,
	};
}

function saveJSON(json: object, filename: string, jsonIndent?: string | number): void {
	const content = JSON.stringify(json, null, jsonIndent);
	const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
	saveAs(blob, filename);
}
