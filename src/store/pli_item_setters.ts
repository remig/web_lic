/* Web Lic - Copyright (C) 2019 Remi Gagne */

import store from '../store';
import Layout from '../layout';

export interface PLIItemMutationInterface {
	add(
		{parent, filename, colorCode, quantity}
		: {parent: LookupItem, filename: string, colorCode: number, quantity?: number}
	): PLIItem;
	delete({pliItem}: {pliItem: LookupItem}): void;
	changeQuantity({pliItem, quantity}: {pliItem: LookupItem, quantity: number}): void;
	markAllDirty(filename?: string): void;
}

export const PLIItemMutations: PLIItemMutationInterface = {
	add(
		{parent, filename, colorCode, quantity = 1}
	) {
		const pliItem = store.mutations.item.add({item: {
			type: 'pliItem', domID: null,
			filename,
			colorCode,
			quantity,
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
		const item = store.get.pliItem(pliItem);
		if (item) {
			store.mutations.item.delete({item: {type: 'quantityLabel', id: item.quantityLabelID}});
			store.mutations.item.delete({item});
		}
	},
	changeQuantity({pliItem, quantity}) {
		const item = store.get.pliItem(pliItem);
		if (item == null) {
			return;
		}
		item.quantity = quantity;
		// New label might be bigger / smaller than before; calculate new size
		const quantityLabel = store.get.quantityLabel(item.quantityLabelID);
		const font = store.state.template.item.quantityLabel.font;
		Layout.label(quantityLabel, font, 'x' + item.quantity);
	},
	markAllDirty(filename) {
		const list = filename
			? store.state.pliItems.filter(item => item.filename === filename)
			: store.state.pliItems;
		list.forEach(item => (item.isDirty = true));
	},
};
