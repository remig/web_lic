/* Web Lic - Copyright (C) 2019 Remi Gagne */

import store from '../store';

export default {
	add(opts) {  // opts: {parent}
		return store.mutations.item.add({item: {
			type: 'pli',
			pliItems: [],
			x: null, y: null, width: null, height: null,
			innerContentOffset: {x: 0, y: 0},
			borderOffset: {x: 0, y: 0}
		}, parent: opts.parent});
	},
	delete(opts) {  // opts: {pli, deleteItem: false}
		const pli = store.get.lookupToItem(opts.pli);
		if (!opts.deleteItems && pli.pliItems && pli.pliItems.length) {
			throw 'Cannot delete a PLI with items';
		}
		store.mutations.item.deleteChildList({item: pli, listType: 'pliItem'});
		store.mutations.item.delete({item: pli});
	},
	empty(opts) {  // opts: {pli}
		const pli = store.get.lookupToItem(opts.pli);
		store.mutations.item.deleteChildList({item: pli, listType: 'pliItem'});
	},
	addPart(opts) {  // opts: {pli, part: {filename, color}}
		const pli = store.get.lookupToItem(opts.pli);
		const pliItem = store.get.matchingPLIItem(pli, opts.part);
		if (pliItem) {
			pliItem.quantity++;
		} else {
			store.mutations.pliItem.add({
				parent: pli,
				filename: opts.part.filename,
				colorCode: opts.part.colorCode
			});
		}
	},
	removePart(opts) {  // opts: {pli, part: {filename, color}}
		const pli = store.get.lookupToItem(opts.pli);
		const pliItem = store.get.matchingPLIItem(pli, opts.part);
		if (pliItem) {
			if (pliItem.quantity === 1) {
				store.mutations.pliItem.delete({pliItem});
			} else {
				pliItem.quantity--;
			}
		}
	},
	toggleVisibility(opts) {  // opts: {visible}
		store.state.plisVisible = opts.visible;
		store.mutations.page.markAllDirty();
	},
	syncContent(opts) {  // opts: {pli, doLayout}
		// Ensure the list of children pliItems matches the content of the parent step
		// Slow but simple solution: delete all pliItems then re-add one for each part
		const pli = store.get.lookupToItem(opts.pli);
		const step = store.get.parent(pli);
		const parts = store.get.partsInStep(step);
		store.mutations.pli.empty({pli});
		parts.forEach(part => store.mutations.pli.addPart({pli, part}));
		if (opts.doLayout) {
			store.mutations.page.layout({page: store.get.pageForItem(pli)});
		}
	}
};
