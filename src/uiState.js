'use strict';

import _ from './util';

const defaultState = {
	locale: null,
	dialog: {
		importModel: {
			stepsPerPage: 1,
			useMaxSteps: true,
			firstPageNumber: 1,
			firstStepNumber: 1,
			addStepsForSubmodels: true,
			include: {
				titlePage: false,
				partListPage: false,
				submodelBreakdown: false,
				pli: true
			}
		},
		export: {
			images: {
				scale: 1
			},
			pdf: {
				// Don't cache physical page size because that should always initially match current pixel page size
				dpi: 96,
				units: 'point'  // One of 'point', 'mm', 'cm', 'in'
			}
		}
	},
	template: null,  // NYI
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
	pliTransforms: {}  // TODO: if scale goes back to 1, don't store it delete it.  Likewise with rotations x|y|z = 0.
};

let currentState = _.clone(defaultState);

const api = {
	get(key) {
		return _.get(key, currentState);
	},
	set(key, prop) {
		currentState[key] = prop;  // TODO: this only works for root keys; 'foo.bar' doesn't work yet
	},
	getCurrentState() {
		return currentState;
	},
	getDefaultState() {
		return _.clone(defaultState);  // Return clone so we don't accidentally modify it; default state is immutable
	},
	getPLITransform(filename) {
		return currentState.pliTransforms[filename] || {};
	},
	resetUIState() {
		currentState = _.clone(defaultState);
	},
	setUIState(newState) {
		currentState = _.clone(newState);
	},
	mutations: {  // TODO: Move more ui state mutations here (pliTransforms in context menu, grid & guide bits in menu, etc
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

export default api;
