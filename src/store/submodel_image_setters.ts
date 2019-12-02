/* Web Lic - Copyright (C) 2018 Remi Gagne */

import store from '../store';

export interface SubmodelImageMutationInterface {
	add(
		{parent, modelFilename, quantity}
		: {parent: LookupItem, modelFilename: string, quantity?: number}
	): SubmodelImage;
	delete(
		{submodelImage, doLayout}
		: {submodelImage: LookupItem, doLayout?: boolean}
	): void;
}

export const submodelImageMutations: SubmodelImageMutationInterface = {
	add({parent, modelFilename, quantity = 1}) {
		const submodelImage = store.mutations.item.add({item: {
			// TODO: submodelImages don't have a CSI, they have a pliItem with no quantity label.  Fix that
			type: 'submodelImage', csiID: null, quantityLabelID: null,
			modelFilename,
			quantity,
			x: null, y: null, width: null, height: null,
			innerContentOffset: {x: 0, y: 0},
		}, parent});

		store.mutations.csi.add({parent: submodelImage});

		if (quantity > 1) {
			store.mutations.item.add({item: {
				type: 'quantityLabel',
				align: 'right', valign: 'bottom',
				x: null, y: null, width: null, height: null,
			}, parent: submodelImage});
		}
		return submodelImage;
	},
	delete({submodelImage, doLayout = false}) {
		const item = store.get.submodelImage(submodelImage);
		if (item == null) {
			return;
		}
		if (item.csiID != null) {
			store.mutations.item.delete({item: store.get.csi(item.csiID)});
		}
		if (item.quantityLabelID != null) {
			store.mutations.item.delete({item: {type: 'quantityLabel', id: item.quantityLabelID}});
		}
		store.mutations.item.delete({item});
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(item)});
		}
	},
};
