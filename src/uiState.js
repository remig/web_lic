'use strict';

import _ from './util';

export const defaultUIState = {
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
		}
	},
	splitter: 20,
	pliTransforms: {}
};

export let uiState = _.clone(defaultUIState);

export function setState(newState) {
	uiState = _.clone(newState);
}
