/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from './util';
import Storage from './storage';

interface GuideInterface {
	orientation: 'horizontal' | 'vertical';
	position: number;
}

interface UIStateInterface {
	locale: string | null;
	lastUsedVersion: string | null;
	dialog: {
		importModel: {
			stepsPerPage: number,
			partsPerStep: number | null,
			useMaxSteps: boolean,
			firstPageNumber: number,
			firstStepNumber: number,
			addStepsForSubmodels: boolean,
			include: {
				titlePage: boolean,
				pli: boolean,
				partListPage: boolean,
			},
		},
		'export': {
			images: {
				scale: number,
				dpi: number,
				maintainPrintSize: boolean,
			},
			pdf: {
				dpi: number,
				units: 'point' | 'mm' | 'cm' | 'in',
			},
		},
		multiBook: {
			firstPageNumber: 'start_page_1' | 'preserve_page_count'
		},
	},
	template: null,
	navTree: {
		expandedNodes: string[],
		checkedItems: {
			all: boolean, page_step_part: boolean, group_parts: boolean,
			step: boolean, submodelImage: boolean, csi: boolean, part: boolean,
			pli: boolean, pliItem: boolean, callout: boolean, calloutArrow: boolean,
			annotation: boolean, numberLabel: boolean, quantityLabel: boolean, divider: boolean,
		},
	},
	pageView: {
		facingPage: boolean,
		scroll: boolean,
	},
	zoom: number,
	grid: {
		enabled: boolean,
		spacing: number,
		offset: {
			top: number,
			left: number,
		},
		line: {
			width: number,
			color: string,
			dash: string[],
		},
	},
	splitter: number,
	guides: GuideInterface[],
	guideStyle: {  // NYI
		width: number,
		color: string,
	},
}

const defaultState: UIStateInterface = {
	locale: null,
	lastUsedVersion: null,
	dialog: {
		importModel: {
			stepsPerPage: 1,
			partsPerStep: null,
			useMaxSteps: true,
			firstPageNumber: 1,
			firstStepNumber: 1,
			addStepsForSubmodels: true,
			include: {
				titlePage: true,
				// submodelBreakdown: false,
				pli: true,
				partListPage: true,
			},
		},
		'export': {
			images: {
				scale: 1,
				dpi: 96,
				maintainPrintSize: true,
			},
			pdf: {
				// Don't cache physical page size because it should initially match current pixel page size
				dpi: 96,
				units: 'point',  // One of 'point', 'mm', 'cm', 'in'
			},
		},
		multiBook: {
			firstPageNumber: 'start_page_1',  // or preserve_page_count
		},
	},
	template: null,  // NYI
	navTree: {
		expandedNodes: [],
		checkedItems: {
			all: true, page_step_part: false, group_parts: false,
			step: true, submodelImage: true, csi: true, part: true,
			pli: true, pliItem: true, callout: true, calloutArrow: true,
			annotation: true, numberLabel: true, quantityLabel: true, divider: true,
		},
	},
	pageView: {
		facingPage: false,
		scroll: false,
	},
	zoom: 1,  // NYI
	grid: {
		enabled: false,
		spacing: 100,
		offset: {
			top: 50,
			left: 50,
		},
		line: {
			width: 1,
			color: 'auto',
			dash: [],
		},
	},
	splitter: 20,
	guides: [],
	guideStyle: {  // NYI
		width: 1,
		color: 'black',
	},
};

Storage.initialize(defaultState);

let currentState = _.cloneDeep(defaultState);

const api = {
	get(key: string) {
		return _.get(currentState, key);
	},
	set(key: string, prop: unknown) {
		_.set(currentState, key, prop);
	},
	getCurrentState() {
		return currentState;
	},
	getDefaultState() {
		// Return clone so we don't accidentally modify it; default state is immutable
		return _.cloneDeep(defaultState);
	},
	resetUIState() {
		currentState = _.cloneDeep(defaultState);
	},
	setUIState(newState: any) {
		currentState = _.cloneDeep(newState);
	},
	mutations: {
		// TODO: Move more ui state mutations here (menu grid & guide bits, etc)
		guides: {
			setPosition(guideID: number, newPosition: number) {
				const originalPosition = currentState.guides[guideID].position;
				const path = `/${guideID}/position`, root = currentState.guides;
				return {
					redo: [{root, op: 'replace', path, value: newPosition}],
					undo: [{root, op: 'replace', path, value: originalPosition}],
				};
			},
		},
	},
};

// Load UI state from storage just once here. uiState module itself keeps a copy for fast lookup everywhere
api.setUIState(Storage.get.ui());

export default api;
