/* Web Lic - Copyright (C) 2019 Remi Gagne */

import { type LookupItem, type PLIItem, type QuantityLabel } from '../item_types';
import Layout from '../layout';
import { store } from '../store';

export const PLIItemMutations = {
	add({
		parent,
		filename,
		colorCode,
		quantity = 1,
	}: {
		parent: LookupItem;
		filename: string;
		colorCode: number;
		quantity?: number;
	}): PLIItem {
		const pliItem = store.mutations.item.add<PLIItem>({
			item: {
				type: 'pliItem',
				id: -1,
				parent,
				filename,
				colorCode,
				quantity,
				quantityLabelID: -1,
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				domID: null,
				isDirty: false,
			},
			parent: parent,
		});

		store.mutations.item.add<QuantityLabel>({
			item: {
				type: 'quantityLabel',
				id: -1,
				parent: pliItem,
				align: 'left',
				valign: 'top',
				x: 0,
				y: 0,
				width: 0,
				height: 0,
			},
			parent: pliItem,
		});

		return pliItem;
	},
	delete({ pliItem }: { pliItem: LookupItem }): void {
		const item = store.get.pliItem(pliItem);
		if (item != null) {
			if (item.quantityLabelID != null) {
				store.mutations.item.delete({
					item: { type: 'quantityLabel', id: item.quantityLabelID },
				});
			}
			store.mutations.item.delete({ item });
		}
	},
	changeQuantity({ pliItem, quantity }: { pliItem: LookupItem; quantity: number }): void {
		const item = store.get.pliItem(pliItem);
		if (item == null) {
			return;
		}
		item.quantity = quantity;
		// New label might be bigger / smaller than before; calculate new size
		if (item.quantityLabelID != null) {
			const quantityLabel = store.get.quantityLabel(item.quantityLabelID);
			const font: string = store.state.template.pliItem.quantityLabel.font;
			Layout.quantityLabel(quantityLabel, font, 'x' + item.quantity);
		}
	},
	markAllDirty(filename?: string): void {
		const list = filename
			? store.state.pliItems.filter((item) => item.filename === filename)
			: store.state.pliItems;
		list.forEach((item) => (item.isDirty = true));
	},
} as const;
