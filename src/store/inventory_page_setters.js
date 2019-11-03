/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';
import LDParse from '../ld_parse';
import Layout from '../layout';

function findPLIItem(filename, colorCode) {
	return store.state.pliItems.find(pliItem => {
		if (pliItem.filename === filename && pliItem.colorCode === colorCode) {
			const parent = store.get.parent(pliItem);
			if (parent.subtype === 'inventoryPage') {
				return true;
			}
		}
		return false;
	});
}

export default {
	add() {  // Add as many inventory pages as needed to fit all parts
		const pageNumber = store.get.lastPage().number + 1;
		const opts = {subtype: 'inventoryPage', pageNumber};
		const page = store.mutations.page.add(opts);
		const itemList = [];  // index: colorCode, value: {filename: quantity}}

		function buildPartList(model) {
			(model.parts || []).forEach(({filename, colorCode}) => {
				if (LDParse.model.isSubmodel(filename)) {
					buildPartList(LDParse.model.get.abstractPart(filename));
				} else {
					if (itemList[colorCode] && itemList[colorCode][filename]) {
						itemList[colorCode][filename]++;
					} else {
						itemList[colorCode] = itemList[colorCode] || {};
						itemList[colorCode][filename] = 1;
					}
				}
			});
		}

		buildPartList(store.model);

		itemList.forEach((partList, colorCode) => {
			_.forOwn(partList, (quantity, filename) => {
				store.mutations.pliItem.add({parent: page, filename, colorCode, quantity});
			});
		});

		Layout.allInventoryPages();
	},
	delete(opts) {  // opts: {page}
		const page = store.get.lookupToItem(opts.page);
		if (page.numberLabelID != null) {
			store.mutations.item.delete({item: store.get.numberLabel(page.numberLabelID)});
		}
		store.mutations.item.deleteChildList({item: page, listType: 'pliItem'});
		store.mutations.item.delete({item: page});
	},
	deleteAll() {
		const pages = store.get.inventoryPages() || [];
		pages.forEach(page => {
			store.mutations.inventoryPage.delete({page});
		});
	},
	addPart(opts) {  // opts: {filename & colorCode or part, doLayout: false}

		const page = store.get.inventoryPages()[0];
		if (!page) {
			return;
		}
		const filename = opts.filename || opts.part.filename;
		const colorCode = opts.colorCode || opts.part.colorCode;

		const pliItem = findPLIItem(filename, colorCode);
		if (pliItem) {
			pliItem.quantity += 1;
		} else {
			store.mutations.pliItem.add({
				parent: page,
				filename,
				colorCode,
				quantity: 1
			});
		}
		if (opts.doLayout) {
			// Only need to layout first page; layout logic will recreate the rest
			store.mutations.page.layout({page});
		}
	},
	removePart(opts) {  // opts: {filename & colorCode or part, doLayout: false}

		const page = store.get.inventoryPages()[0];
		if (!page) {
			return;
		}
		const filename = opts.filename || opts.part.filename;
		const colorCode = opts.colorCode || opts.part.colorCode;
		const pliItem = findPLIItem(filename, colorCode);
		if (pliItem) {
			if (pliItem.quantity === 1) {
				store.mutations.pliItem.delete({pliItem});
			} else {
				pliItem.quantity--;
			}
		}

		if (opts.doLayout) {
			// Only need to layout first page; layout logic will recreate the rest
			store.mutations.page.layout({page});
		}
	}
};
