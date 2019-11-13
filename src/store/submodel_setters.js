/* Web Lic - Copyright (C) 2018 Remi Gagne */

import store from '../store';

export default {
	convertToCallout({modelFilename, destStep, doLayout}) {

		// Create a new callout in the step that this submodel is added to
		destStep = store.get.lookupToItem(destStep);
		const callout = store.mutations.callout.add({parent: destStep});

		const submodelSteps = store.state.steps.filter(step => step.model.filename === modelFilename);
		const quantity = store.get.submodels().find(el => el.filename === modelFilename).quantity;
		const destPLI = (destStep.pliID == null) ? null : store.get.pli(destStep.pliID);
		const pagesToDelete = new Set();

		// Remove submodel from destPLI (if any)
		if (destPLI != null) {
			const pliItem = destPLI.pliItems.map(store.get.pliItem)
				.find(el => el.filename === modelFilename);
			if (pliItem) {
				store.mutations.pliItem.delete({pliItem});
			}
		}

		// Move each step in the submodel into the new callout
		submodelSteps.forEach((step, stepIdx) => {
			if (step.pliID != null) {
				const oldPLI = store.get.pli(step.pliID);
				if (destPLI != null) {
					// Move each part from the old PLI into the new PLI
					while (oldPLI.pliItems.length) {
						const item = {id: oldPLI.pliItems[0], type: 'pliItem'};
						store.mutations.item.reparent({item, newParent: destPLI});
						if (quantity > 1) {
							store.mutations.pliItem.changeQuantity({pliItem: item, quantity});
						}
					}
				}
				store.mutations.pli.delete({pli: oldPLI, deleteItems: true});
			}
			step.submodelImages.forEach(submodelImageID => {
				store.mutations.submodelImage.delete({
					submodelImage: {type: 'submodelImage', id: submodelImageID},
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
		if (doLayout) {
			store.mutations.page.layout({page: destStep.parent});
		}
	},
};
