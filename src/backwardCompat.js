'use strict';

const api = {

	fixLicSaveFile(content) {

		const state = content.state;

		state.steps.forEach(step => {
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
		});

		state.annotations.forEach(annotation => {
			if (!annotation.relativeTo) {
				annotation.relativeTo = annotation.parent;
			}
		});

		if (state.template.submodelImage.maxHeight == null) {
			state.template.submodelImage.maxHeight = 0.3;
		}
	}
};

export default api;
