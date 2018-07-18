'use strict';

import _ from '../util';
import store from '../store';
import LDParse from '../LDParse';

export default {
	add() {
		const pageNumber = store.get.lastPage().number + 1;
		const opts = {pageType: 'inventoryPage', pageNumber};
		const page = store.mutations.page.add(opts);
		const itemList = {};  // key: colorCode, value: {filename: quantity}}

		function buildPartList(model) {
			model.parts.forEach(({filename, colorCode}) => {
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

		_.forEach(itemList, (colorCode, partList) => {
			_.forEach(partList, (filename, quantity) => {
				store.mutations.pliItem.add({ parent: page, filename, colorCode, quantity});
			});
		});
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
		const pages = store.state.inventoryPages;
		while (pages.length) {
			store.mutations.inventoryPage.delete({page: pages[0]});
		}
	}
};