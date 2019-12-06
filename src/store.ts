/* Web Lic - Copyright (C) 2018 Remi Gagne */

/* global saveAs: false */

import _ from './util';
import cache from './cache';
import {RendererInterface, Renderer} from './store/render';
import {GetterInterface, Getters} from './store/getters';
import {MutationInterface, Mutations} from './store/mutations';

import LDParse from './ld_parse';
import LDRender from './ld_render';
import defaultTemplate from './template';
import Storage from './storage';
import packageInfo from '../package.json';

const emptyState = {
	annotations: [],
	books: [],
	calloutArrows: [],
	callouts: [],
	csis: [],
	dividers: [],
	licFilename: null,  // user-visible filename (without extension) used to load / save lic file
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

interface SaveContent {
	version: string;
	partDictionary: any;
	colorTable: any;
	modelFilename: any;
	state: any;
}

interface Store {
	version: string | null;
	model: Model | null;
	setModel(model: Model): void;
	state: StateInterface;

	replaceState(state: any): void;
	resetState(): void;
	load(content: SaveContent): void;
	saveLocal(): void;
	saveToFile(filename?: string, jsonIndent?: number): void;
	saveTemplate(filename?: string, jsonIndent?: number): void;
	render: RendererInterface;
	get: GetterInterface;
	mutations: MutationInterface;
	[key: string]: any;
}

const store: Store = {

	version: null,  // The version of Lic that created this state

	// The currently loaded LDraw model, as returned from LDParse
	model: null,  // Not in state because it is saved separately, and not affected by undo / redo
	setModel(model: Model) {
		store.model = model;
		LDRender.setModel(model);
		store.state.licFilename = store.get.modelFilenameBase();
	},
	// Stores anything that must work with undo / redo, and all state that is saved to the binary .lic,
	//  except static stuff in model, like part geometries
	state: _.cloneDeep(emptyState),
	replaceState(state: any) {
		store.state = state;
		cache.reset();
	},
	resetState() {
		if (store.model) {
			delete LDParse.partDictionary[store.model.filename];
		}
		store.model = null;
		store.state = _.cloneDeep(emptyState);
		cache.reset();
	},
	load(content: SaveContent) {
		LDParse.setPartDictionary(content.partDictionary);
		LDParse.setColorTable(content.colorTable);
		store.model = LDParse.partDictionary[content.modelFilename];
		LDRender.setModel(LDParse.partDictionary[content.modelFilename]);
		LDRender.setRenderState(content.state.template.sceneRendering);
		store.replaceState(content.state);
	},
	saveLocal() {
		const content = getSaveContent();
		console.log('Updating local storage');  // eslint-disable-line no-console
		Storage.replace.model(content);
	},
	saveToFile(filename?: string, jsonIndent?: number) {
		const content = getSaveContent();
		filename = (filename || store.state.licFilename || 'filename') + '.lic';
		saveJSON(content, filename, jsonIndent);
	},
	saveTemplate(filename?: string, jsonIndent?: number) {
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

function getSaveContent(): object {
	return {
		version: packageInfo.version,
		partDictionary: LDParse.partDictionary,
		colorTable: LDParse.colorTable,
		modelFilename: store?.model?.filename,
		state: store.state,
	};
}

function saveJSON(json: object, filename: string, jsonIndent?: number): void {
	const content = JSON.stringify(json, null, jsonIndent);
	const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
	saveAs(blob, filename);
}


export default store;
