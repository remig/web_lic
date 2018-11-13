/* Web Lic - Copyright (C) 2018 Remi Gagne */

'use strict';

import store from '../store';

export default {
	convertToCallout(opts) {  // opts: {modelFilename, destStep, doLayout}
		// Create a new callout in the step that this submodel is added to
		const destStep = store.get.lookupToItem(opts.destStep);
		const callout = store.mutations.callout.add({parent: destStep});
		const destPLI = (destStep.pliID == null) ? null : store.get.pli(destStep.pliID);
		if (destPLI) {
			store.mutations.pli.empty({pli: destPLI});
		}

		// Move each step in the submodel into the new callout
		const submodelSteps = store.state.steps.filter(step => step.model.filename === opts.modelFilename);

		const pagesToDelete = new Set();
		submodelSteps.forEach((step, stepIdx) => {
			if (step.pliID != null) {
				const oldPLI = store.get.pli(step.pliID);
				if (destPLI != null) {
					while (oldPLI.pliItems.length) {
						const item = {id: oldPLI.pliItems[0], type: 'pliItem'};
						store.mutations.item.reparent({item, newParent: destPLI});
					}
				}
				store.mutations.pli.delete({pli: oldPLI, deleteItems: true});
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
