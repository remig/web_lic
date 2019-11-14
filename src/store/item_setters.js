/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';
import Layout from '../layout';

const api = {
	add(
		{item, parent, insertionIndex = -1, parentInsertionIndex = -1}
	) {
		item.id = store.get.nextItemID(item);
		if (store.state.hasOwnProperty(item.type)) {
			store.state[item.type] = item;
		} else {
			_.insert(store.state[item.type + 's'], item, insertionIndex);
		}
		if (parent) {
			parent = store.get.lookupToItem(parent);
			item.parent = {type: parent.type, id: parent.id};
			if (parent.hasOwnProperty(item.type + 's')) {
				_.insert(parent[item.type + 's'], item.id, parentInsertionIndex);
			} else if (parent.hasOwnProperty(item.type + 'ID')) {
				parent[item.type + 'ID'] = item.id;
			}
		}
		return item;
	},
	delete({item}) {
		item = store.get.lookupToItem(item);
		_.deleteItem(store.state[item.type + 's'], item);
		if (item.parent) {
			const parent = store.get.lookupToItem(item.parent);
			if (parent.hasOwnProperty(item.type + 's')) {
				_.deleteItem(parent[item.type + 's'], item.id);
			} else if (parent.hasOwnProperty(item.type + 'ID')) {
				parent[item.type + 'ID'] = null;
			}
		}
	},
	deleteChildList({item, listType}) {
		const parent = store.get.lookupToItem(item);
		const list = parent[listType + 's'] || [];
		const itemType = store.mutations[listType]
			? listType
			: 'item';
		while (list.length) {
			store.mutations[itemType].delete({
				[itemType]: {type: listType, id: list[0]},
			});
		}
	},
	reparent(
		{item, newParent, parentInsertionIndex = -1}
	) {
		item = store.get.lookupToItem(item);
		const oldParent = store.get.parent(item) || {};
		newParent = store.get.lookupToItem(newParent);
		item.parent.id = newParent.id;
		item.parent.type = newParent.type;
		if (oldParent.hasOwnProperty(item.type + 's')) {
			_.deleteItem(oldParent[item.type + 's'], item.id);
		} else if (oldParent.hasOwnProperty(item.type + 'ID')) {
			oldParent[item.type + 'ID'] = null;
		}
		if (newParent.hasOwnProperty(item.type + 's')) {
			_.insert(newParent[item.type + 's'], item.id, parentInsertionIndex);
		} else if (newParent.hasOwnProperty(item.type + 'ID')) {
			newParent[item.type + 'ID'] = item.id;
		}
	},
	reposition({item, dx, dy}) {
		const items = Array.isArray(item) ? item : [item];
		items.forEach(localItem => {
			if (localItem.type === 'divider') {  // special case: dividers must move both points
				// TODO: change 'p1' & 'p2' in divider to proper points; won't need this special case
				store.mutations.divider.reposition({item: localItem, dx, dy});
			} else if (localItem.points) {
				localItem.points.forEach(pt => {
					pt = store.get.point(pt);
					pt.x += dx;
					pt.y += dy;
				});
			} else {
				localItem.x += dx;
				localItem.y += dy;
				const parentType = localItem.parent.type;
				if (Layout.adjustBoundingBox[parentType]) {
					Layout.adjustBoundingBox[parentType](localItem.parent);
				}
			}
		});
	},
};

export default api;
