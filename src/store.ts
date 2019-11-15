/* Web Lic - Copyright (C) 2018 Remi Gagne */

/* global saveAs: false */

import {Model} from './item_types';

import _ from './util';
import cache from './cache';
import Renderer from './store/render';
import Getters from './store/getters';
import {MutationInterface, Mutations} from './store/mutations';

import LDParse from './ld_parse';
import LDRender from './ld_render';
import defaultTemplate from './template';
import Storage from './storage';
import packageInfo from '../package.json';

const emptyState = {
	template: _.cloneDeep(defaultTemplate),
	licFilename: null,  // user-visible filename (without extension) used to load / save lic file
	plisVisible: true,
	pliTransforms: {},
	books: [],
	pages: [],
	dividers: [],
	steps: [],
	csis: [],
	plis: [],
	pliItems: [],
	quantityLabels: [],
	numberLabels: [],
	submodelImages: [],
	annotations: [],
	callouts: [],
	calloutArrows: [],
	points: [],
	rotateIcons: [],
};

interface SaveContent {
	version: string;
	partDictionary: any;
	colorTable: any;
	modelFilename: any;
	state: any;
}

type SaveModes = 'file' | 'local';
type SaveTargets = 'state' | 'template';

interface Store {
	version: string | null;
	model: Model | null;
	setModel(model: Model): void;
	state: any;

	replaceState(state: any): void;
	resetState(): void;
	load(content: SaveContent): void;
	save(
		{mode, target, filename, jsonIndent}
		: {mode: SaveModes, target: SaveTargets, filename: string, jsonIndent: number}
	): void;
	render: any;
	get: any;
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
	// mode is either 'file' or 'local', target is either 'state' or 'template'
	// filename is optional; if set, will use that instead of store.state.licFilename
	save({mode, target = 'state', filename, jsonIndent}) {
		let content;
		if (target === 'template') {
			content = {
				version: packageInfo.version,
				template: store.state.template,
			};
		} else {
			content = {
				version: packageInfo.version,
				partDictionary: LDParse.partDictionary,
				colorTable: LDParse.colorTable,
				modelFilename: store?.model?.filename,
				state: store.state,
			};
		}
		if (mode === 'file') {
			content = JSON.stringify(content, null, jsonIndent);
			const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
			filename = filename || store.state.licFilename;
			filename = (target === 'template') ? filename + '.lit' : filename + '.lic';
			saveAs(blob, filename);
		} else if (mode === 'local' && target !== 'template') {
			console.log('Updating local storage');  // eslint-disable-line no-console
			Storage.replace.model(content);
		}
	},
	render: Renderer,
	get: Getters,
	mutations: Mutations,
};

export default store;
