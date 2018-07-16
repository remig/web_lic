'use strict';

const api = {

	fixLicSaveFile(content) {

		const state = content.state;

		if (state.inventoryPages == null) {
			state.inventoryPages = [];
		}

		state.steps.forEach(step => {
			if (step.stretchedPages == null) {
				step.stretchedPages = [];
			}
			if (step.annotations == null) {
				step.annotations = [];
			}
			if (step.displacedParts) {
				step.displacedParts.forEach(d => {
					if (d.hasOwnProperty('distance')) {
						d.partDistance = d.distance;
						delete d.distance;
					}
				});
			}
		});

		state.csis.forEach(csi => {
			if (csi.annotations == null) {
				csi.annotations = [];
			}
		});

		state.callouts.forEach(callout => {
			if (!callout.hasOwnProperty('borderOffset')) {
				callout.borderOffset = {x: 0, y: 0};
			}
			if (!callout.hasOwnProperty('position')) {
				callout.position = 'left';
			}
		});

		state.pliItems.forEach(pliItem => {
			delete pliItem.partNumbers;
		});

		if (state.template.submodelImage.maxHeight == null) {
			state.template.submodelImage.maxHeight = 0.3;
		}
	}
};

export default api;
