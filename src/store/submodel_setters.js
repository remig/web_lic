'use strict';

import store from '../store';

export default {
	convertToCallout(opts) {  // opts: {modelFilename, destStep, doLayout}
		// Create a new callout in the step that this submodel is added to
		const destStep = store.get.lookupToItem(opts.destStep);
		const callout = store.mutations.callout.add({parent: destStep});

		// Move each step in the submodel into the new callout
		const submodelSteps = store.state.steps.filter(step => step.model.filename === opts.modelFilename);

		const pagesToDelete = new Set();
		submodelSteps.forEach((step, stepIdx) => {
			if (step.pliID) {
				store.mutations.pli.delete({
					pli: {type: 'pli', id: step.pliID},
					deleteItems: true
				});
			}
			step.submodelImages.forEach(submodelImageID => {
				store.mutations.submodelImage.delete({
					submodelImage: {type: 'submodelImage', id: submodelImageID}
				});
			});
			pagesToDelete.add(step.parent.id);
			store.mutations.item.reparent({item: step, newParent: callout});
			step.number = stepIdx + 1;
		});

		for (const pageID of pagesToDelete) {
			const page = store.get.page(pageID);
			if (page && !page.steps.length) {
				store.mutations.page.delete({page});
			}
		}
		store.mutations.step.renumber();
		if (opts.doLayout) {
			store.mutations.page.layout({page: destStep.parent});
		}
	}
};
