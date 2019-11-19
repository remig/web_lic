/* Web Lic - Copyright (C) 2019 Remi Gagne */

import store from '../store';
import Layout from '../layout';

export default {
	add(
		{parent, filename, colorCode, quantity = 1}
	) {
		const pliItem = store.mutations.item.add({item: {
			type: 'pliItem', domID: null,
			filename: filename,
			colorCode: colorCode,
			quantity: (quantity == null) ? 1 : quantity,
			quantityLabelID: null,
			x: null, y: null, width: null, height: null,
		}, parent: parent});

		store.mutations.item.add({item: {
			type: 'quantityLabel',
			align: 'left', valign: 'top',
			x: null, y: null, width: null, height: null,
		}, parent: pliItem});

		return pliItem;
	},
	delete({pliItem}) {
		pliItem = store.get.lookupToItem(pliItem);
		store.mutations.item.delete({item: {type: 'quantityLabel', id: pliItem.quantityLabelID}});
		store.mutations.item.delete({item: pliItem});
	},
	changeQuantity({pliItem, quantity}) {
		pliItem = store.get.lookupToItem(pliItem);
		pliItem.quantity = quantity;
		// New label might be bigger / smaller than before; calculate new size
		const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
		const font = store.state.template.pliItem.quantityLabel.font;
		Layout.label(quantityLabel, font, 'x' + pliItem.quantity);
	},
	markAllDirty(filename) {
		let list = store.state.pliItems;
		list = filename ? list.filter(item => item.filename === filename) : list;
		list.forEach(item => (item.isDirty = true));
	},
};
