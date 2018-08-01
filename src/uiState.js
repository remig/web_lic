/* Web Lic - Copyright (C) 2018 Remi Gagne */

'use strict';

import _ from './util';
import Storage from './storage';

const defaultState = {
	locale: null,
	lastUsedVersion: null,
	dialog: {
		importModel: {
			stepsPerPage: 1,
			useMaxSteps: true,
			firstPageNumber: 1,
			firstStepNumber: 1,
			addStepsForSubmodels: true,
			include: {
				titlePage: false,
				submodelBreakdown: false,
				pli: true,
				partListPage: false
			}
		},
		export: {
			images: {
				scale: 1,
				dpi: 96,
				maintainPrintSize: true
			},
			pdf: {
				// Don't cache physical page size because it should initially match current pixel page size
				dpi: 96,
				units: 'point'  // One of 'point', 'mm', 'cm', 'in'
			}
		}
	},
	template: null,  // NYI
	navTree: {
		expandedLevel: 0,
		checkedItems: {
			all: true, page_step_part: false, group_parts: false,
			steps: true, submodelImages: true, submodelCSI: true, csis: true, parts: true,
			plis: true, pliItems: true, callouts: true, calloutArrows: true,
			annotations: true, numberLabels: true, quantityLabels: true, dividers: true
		}
	},
	pageView: {
		facingPage: false,
		scroll: false
	},
	zoom: 1,  // NYI
	grid: {
		enabled: false,
		spacing: 100,
		offset: {
			top: 50,
			left: 50
		},
		line: {
			width: 1,
			color: 'auto',
			dash: []
		}
	},
	splitter: 20,
	guides: [],
	guideStyle: {  // NYI
		width: 1,
		color: 'black'
	},
	pliTransforms: {}  // TODO: If scale set back to 1, delete it, don't store it. Same for rotations x|y|z=0
};

Storage.initialize(defaultState);

let currentState = _.cloneDeep(defaultState);

const api = {
	get(key) {
		return _.get(currentState, key);
	},
	set(key, prop) {
		currentState[key] = prop;  // TODO: this only works for root keys; 'foo.bar' doesn't work yet
	},
	getCurrentState() {
		return currentState;
	},
	getDefaultState() {
		// Return clone so we don't accidentally modify it; default state is immutable
		return _.cloneDeep(defaultState);
	},
	getPLITransform(filename) {
		return currentState.pliTransforms[filename] || {};
	},
	resetUIState() {
		currentState = _.cloneDeep(defaultState);
	},
	setUIState(newState) {
		currentState = _.cloneDeep(newState);
	},
	mutations: {
		// TODO: Move more ui state mutations here (context menu pliTransforms, menu grid & guide bits, etc)
		guides: {
			setPosition(guideID, newPosition) {
				const originalPosition = currentState.guides[guideID].position;
				const path = `/${guideID}/position`, root = currentState.guides;
				return {
					action: {
						redo: [{root, op: 'replace', path, value: newPosition}],
						undo: [{root, op: 'replace', path, value: originalPosition}]
					}
				};
			}
		}
	}
};

// Load UI state from storage just once here. uiState module itself keeps a copy for fast lookup everywhere
api.setUIState(Storage.get.ui());

export default api;
