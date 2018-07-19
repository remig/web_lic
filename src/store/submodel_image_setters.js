'use strict';

import store from '../store';

export default {
	add(opts) {  // opts: {parent, modelFilename, quantity}
		const submodelImage = store.mutations.item.add({item: {
			// TODO: submodelImages don't have a CSI, they have a pliItem with no quantity label.  Fix that
			type: 'submodelImage', csiID: null, quantityLabelID: null,
			modelFilename: opts.modelFilename, quantity: opts.quantity || 1,
			x: null, y: null, width: null, height: null,
			innerContentOffset: {x: 0, y: 0}
		}, parent: opts.parent});

		store.mutations.csi.add({parent: submodelImage});

		if (opts.quantity > 1) {
			store.mutations.item.add({item: {
				type: 'quantityLabel',
				align: 'right', valign: 'bottom',
				x: null, y: null, width: null, height: null
			}, parent: submodelImage});
		}
		return submodelImage;
	},
	delete(opts) {  // opts: {submodelImage, doLayout}
		const submodelImage = store.get.lookupToItem(opts.submodelImage);
		if (submodelImage.csiID != null) {
			store.mutations.item.delete({item: store.get.csi(submodelImage.csiID)});
		}
		if (submodelImage.quantityLabelID != null) {
			store.mutations.item.delete({item: {type: 'quantityLabel', id: submodelImage.quantityLabelID}});
		}
		store.mutations.item.delete({item: submodelImage});
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(submodelImage)});
		}
	}
};
