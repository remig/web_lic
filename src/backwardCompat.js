'use strict';

const api = {

	fixLicSaveFile(content) {

		const state = content.state;

		state.callouts.forEach(callout => {
			if (!callout.hasOwnProperty('borderOffset')) {
				callout.borderOffset = {x: 0, y: 0};
			}
		});

		if (state.template.submodelImage.maxHeight == null) {
			state.template.submodelImage.maxHeight = 0.3;
		}
	}
};

export default api;
