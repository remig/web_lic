'use strict';

const uiState = {
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
	splitter: 20
};

export default uiState;
