'use strict';

const api = {

	fixLicSaveFile(content) {

		content.state.callouts.forEach(callout => {
			if (!callout.hasOwnProperty('borderOffset')) {
				callout.borderOffset = {x: 0, y: 0};
			}
		});
	}
};

export default api;
