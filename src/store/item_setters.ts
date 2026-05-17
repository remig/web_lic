/* Web Lic - Copyright (C) 2018 Remi Gagne */

import {
	type Item,
	type ItemTypeNames,
	type ItemTypes,
	type LookupItem,
	type PointedItem,
	type PointListItem,
} from "../item_types";
import Layout from "../layout";
import store from "../store";
import { hasProperty, isItemSpecificType } from "../type_helpers";
import _ from "../util";

export interface ItemMutationInterface {
	add<T extends ItemTypes>({
		item,
		parent,
		insertionIndex,
		parentInsertionIndex,
	}: {
		item: T;
		parent: LookupItem | null;
		insertionIndex?: number;
		parentInsertionIndex?: number;
	}): T;
	delete({ item }: { item: LookupItem | null }): void;
	deleteChildList({
		item,
		listType,
	}: {
		item: LookupItem | null;
		listType: ItemTypeNames;
	}): void;
	reparent({
		item,
		newParent,
		parentInsertionIndex,
	}: {
		item: LookupItem | null;
		newParent: LookupItem | null;
		parentInsertionIndex?: number;
	}): void;
	reposition({
		item,
		dx,
		dy,
	}: {
		item: LookupItem | LookupItem[];
		dx: number;
		dy: number;
	}): void;
}

export const ItemMutations: ItemMutationInterface = {
	add({ item, parent, insertionIndex = -1, parentInsertionIndex = -1 }) {
		item.id = store.get.nextItemID(item);
		if (Object.prototype.hasOwnProperty.call(store.state, item.type)) {
			// TODO: does this ever get hit?
			(store.state as any)[item.type] = item;
		} else if (hasListProperty(store.state, item.type)) {
			_.insert((store.state as any)[item.type + "s"], item, insertionIndex);
		}
		if (parent) {
			const parentItem = store.get.lookupToItem(parent);
			if (parentItem) {
				item.parent = { type: parentItem.type, id: parentItem.id };
				if (Object.prototype.hasOwnProperty.call(parentItem, item.type + "s")) {
					_.insert(
						(parentItem as any)[item.type + "s"],
						item.id,
						parentInsertionIndex
					);
				} else if (
					Object.prototype.hasOwnProperty.call(parentItem, item.type + "ID")
				) {
					(parentItem as any)[item.type + "ID"] = item.id;
				}
			}
		}
		return item;
	},
	delete({ item }) {
		const target = store.get.lookupToItem(item);
		if (target == null) {
			return;
		}
		_.deleteItem((store.state as any)[target.type + "s"], target);
		const parent = store.get.lookupToItem(target.parent);
		if (parent) {
			if (hasListProperty(parent, target.type)) {
				_.deleteItem((parent as any)[target.type + "s"], target.id);
			} else if (hasIDProperty(parent, target.type)) {
				(parent as any)[target.type + "ID"] = null;
			}
		}
	},
	deleteChildList({ item, listType }) {
		const parent = store.get.lookupToItem(item);
		if (parent == null || !hasListProperty(parent, listType)) {
			return;
		}
		const list = getList(parent, listType);
		let itemType: any = listType;
		let mutation: any = store.mutations[listType];
		if (mutation == null || mutation.delete == null) {
			mutation = store.mutations.item;
			itemType = "item";
		}
		while (list.length) {
			mutation.delete({
				[itemType]: { type: listType, id: list[0] },
			});
		}
	},
	reparent({ item, newParent, parentInsertionIndex = -1 }) {
		const target = store.get.lookupToItem(item);
		const newTarget = store.get.lookupToItem(newParent);
		if (target == null || newTarget == null) {
			return;
		}
		const oldParent = store.get.parent(target);
		target.parent = {
			id: newTarget.id,
			type: newTarget.type,
		};
		if (oldParent) {
			if (hasListProperty(oldParent, target.type)) {
				const list = getList(oldParent, target.type);
				_.deleteItem(list, target.id);
			} else if (hasIDProperty(oldParent, target.type)) {
				(oldParent as any)[target.type + "ID"] = null;
			}
		}
		if (hasListProperty(newTarget, target.type)) {
			const list = getList(newTarget, target.type);
			_.insert(list, target.id, parentInsertionIndex);
		} else if (hasIDProperty(newTarget, target.type)) {
			(newTarget as any)[target.type + "ID"] = target.id;
		}
	},
	reposition({ item, dx, dy }) {
		const items = Array.isArray(item) ? item : [item];
		items.forEach((lookup) => {
			const localItem = store.get.lookupToItem(lookup);
			if (localItem == null) {
				return;
			}
			if (isItemSpecificType(localItem, "divider")) {
				// special case: dividers must move both points
				// TODO: change 'p1' & 'p2' in divider to proper points; won't need this special case
				store.mutations.divider.reposition({ item: localItem, dx, dy });
			} else if (
				hasProperty<PointListItem>(localItem, "points") &&
				localItem.points.length > 0
			) {
				localItem.points.forEach((ptId) => {
					const pt = store.get.point(ptId);
					if (pt) {
						pt.x += dx;
						pt.y += dy;
					}
				});
			} else if (hasProperty<PointedItem>(localItem, "x")) {
				localItem.x += dx;
				localItem.y += dy;
				const parentType = localItem.parent.type;
				const handler: any = Layout.adjustBoundingBox;
				if (Object.prototype.hasOwnProperty.call(handler, parentType)) {
					handler[parentType](localItem.parent);
				}
			}
		});
	},
};

function hasListProperty(item: any, prop: ItemTypeNames): item is Item {
	return item != null && Object.prototype.hasOwnProperty.call(item, prop + "s");
}

function hasIDProperty(item: Item, prop: ItemTypeNames): item is Item {
	return (
		item != null && Object.prototype.hasOwnProperty.call(item, prop + "ID")
	);
}

function getList(item: Item, listType: ItemTypeNames): number[] {
	return (item as any)[listType + "s"];
}
