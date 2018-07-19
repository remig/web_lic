'use strict';

import _ from '../util';
import store from '../store';
import Layout from '../layout';

const api = {
	add(opts) {  // opts: {itemJSON, parent, insertionIndex = -1, parentInsertionIndex = =1}
		const item = opts.item;
		item.id = store.get.nextItemID(item);
		if (store.state.hasOwnProperty(item.type)) {
			store.state[item.type] = item;
		} else {
			_.insert(store.state[item.type + 's'], item, opts.insertionIndex);
		}
		if (opts.parent) {
			const parent = store.get.lookupToItem(opts.parent);
			item.parent = {type: parent.type, id: parent.id};
			if (parent.hasOwnProperty(item.type + 's')) {
				_.insert(parent[item.type + 's'], item.id, opts.parentInsertionIndex);
			} else if (parent.hasOwnProperty(item.type + 'ID')) {
				parent[item.type + 'ID'] = item.id;
			}
		}
		return item;
	},
	delete(opts) {  // opts: {item}
		const item = store.get.lookupToItem(opts.item);
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
	deleteChildList(opts) {  // opts: {item, listType}
		const itemType = store.mutations[opts.listType] ? opts.listType : 'item';
		const parent = store.get.lookupToItem(opts.item);
		const list = parent[opts.listType + 's'] || [];
		while (list.length) {
			const arg = {};
			arg[itemType] = {type: opts.listType, id: list[0]};
			store.mutations[itemType].delete(arg);
		}
	},
	reparent(opts) {  // opts: {item, newParent, parentInsertionIndex = -1}
		const item = store.get.lookupToItem(opts.item);
		const oldParent = store.get.parent(item);
		const newParent = store.get.lookupToItem(opts.newParent);
		item.parent.id = newParent.id;
		item.parent.type = newParent.type;
		if (oldParent.hasOwnProperty(item.type + 's')) {
			_.deleteItem(oldParent[item.type + 's'], item.id);
		} else if (oldParent.hasOwnProperty(item.type + 'ID')) {
			oldParent[item.type + 'ID'] = null;
		}
		if (newParent.hasOwnProperty(item.type + 's')) {
			_.insert(newParent[item.type + 's'], item.id, opts.parentInsertionIndex);
		} else if (newParent.hasOwnProperty(item.type + 'ID')) {
			newParent[item.type + 'ID'] = item.id;
		}
	},
	reposition(opts) {  // opts: {item or [items], dx, dy}
		const items = Array.isArray(opts.item) ? opts.item : [opts.item];
		items.forEach(item => {
			if (item.type === 'divider') {  // special case: dividers must move both points
				// TODO: change 'p1' & 'p2' in divider to proper points; won't need this special case
				store.mutations.divider.reposition(opts);
			} else if (item.points) {
				item.points.forEach(pt => {
					pt = store.get.point(pt);
					pt.x += opts.dx;
					pt.y += opts.dy;
				});
			} else {
				item.x += opts.dx;
				item.y += opts.dy;
				const parentType = item.parent.type;
				if (Layout.adjustBoundingBox[parentType]) {
					Layout.adjustBoundingBox[parentType](item.parent);
				}
			}
		});
	}
};

export default api;
