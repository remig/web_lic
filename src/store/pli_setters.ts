/* Web Lic - Copyright (C) 2019 Remi Gagne */

import store from '../store';

export interface PLIMutationInterface {
	add({parent}: {parent: LookupItem}): void;
	delete({pli, deleteItems}: {pli: LookupItem, deleteItems: boolean}): void;
	empty({pli}: {pli:LookupItem}): void;
	addPart({pli, part}: {pli: LookupItem, part: Part}): void;
	removePart({pli, part}: {pli: LookupItem, part: Part}): void;
	toggleVisibility({visible}: {visible: boolean}): void;
	syncContent({pli, doLayout}: {pli: LookupItem, doLayout?: boolean}): void;
}

export const PLIMutations: PLIMutationInterface = {
	add({parent}) {
		return store.mutations.item.add({item: {
			type: 'pli',
			pliItems: [],
			x: null, y: null, width: null, height: null,
			innerContentOffset: {x: 0, y: 0},
			borderOffset: {x: 0, y: 0},
		}, parent});
	},
	delete({pli, deleteItems = false}) {
		const item = store.get.pli(pli);
		if (item == null) {
			return;
		}
		if (!deleteItems && item.pliItems && item.pliItems.length) {
			throw 'Cannot delete a PLI with items';
		}
		store.mutations.item.deleteChildList({item, listType: 'pliItem'});
		store.mutations.item.delete({item});
	},
	empty({pli}) {
		const item = store.get.pli(pli);
		store.mutations.item.deleteChildList({item, listType: 'pliItem'});
	},
	addPart({pli, part}) {  // part = {filename, color}
		const item = store.get.pli(pli);
		if (item == null || part == null || part.colorCode == null) {
			return;
		}
		const pliItem = store.get.matchingPLIItem(item, part);
		if (pliItem) {
			pliItem.quantity++;
		} else {
			store.mutations.pliItem.add({
				parent: item,
				filename: part.filename,
				colorCode: part.colorCode,
			});
		}
	},
	removePart({pli, part}) {  // part = {filename, color}
		const item = store.get.pli(pli);
		if (item == null) {
			return;
		}
		const pliItem = store.get.matchingPLIItem(item, part);
		if (pliItem) {
			if (pliItem.quantity === 1) {
				store.mutations.pliItem.delete({pliItem});
			} else {
				pliItem.quantity--;
			}
		}
	},
	toggleVisibility({visible}) {
		store.state.plisVisible = visible;
		store.mutations.page.markAllDirty();
	},
	syncContent({pli, doLayout}) {
		// Ensure the list of children pliItems matches the content of the parent step
		// Slow but simple solution: delete all pliItems then re-add one for each part
		const item = store.get.lookupToItem(pli);
		if (item == null) {
			return;
		}
		const step = store.get.parent(item);
		if (step == null) {
			return;
		}
		const parts = store.get.partsInStep(step);
		store.mutations.pli.empty({pli: item});
		parts.forEach(part => store.mutations.pli.addPart({pli: item, part}));
		if (doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(item)});
		}
	},
};
