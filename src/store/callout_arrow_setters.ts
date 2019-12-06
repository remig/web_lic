/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';

export interface CalloutArrowMutationInterface {
	add({parent}: {parent: LookupItem}): CalloutArrow;
	delete({calloutArrow}: {calloutArrow: CalloutArrow}): void;
	addPoint({arrow}: {arrow: CalloutArrow}): void;
	rotateTip({arrow, direction}: {arrow: CalloutArrow, direction: Direction}): void;
}

export const CalloutArrowMutations: CalloutArrowMutationInterface = {
	add({parent}) {
		const arrow = store.mutations.item.add<CalloutArrow>({item: {
			type: 'calloutArrow', id: -1, parent,
			points: [], direction: 'right',
		}, parent});

		store.mutations.item.add<PointItem>({item: {
			type: 'point', id: -1, parent: arrow,
			x: 0, y: 0, relativeTo: null,
		}, parent: arrow});

		store.mutations.item.add<PointItem>({item: {
			type: 'point', id: -1, parent: arrow,
			x: 0, y: 0, relativeTo: null,
		}, parent: arrow});

		return arrow;
	},
	delete({calloutArrow}) {
		const item = calloutArrow;
		store.mutations.item.deleteChildList({item, listType: 'point'});
		store.mutations.item.delete({item});
	},
	addPoint({arrow}) {
		const arrowItem = store.get.calloutArrow(arrow);
		if (arrowItem == null) {
			return;
		}
		const parentInsertionIndex = Math.ceil(arrowItem.points.length / 2);
		const p1 = store.get.point(arrowItem.points[parentInsertionIndex - 1]);
		const p2 = store.get.point(arrowItem.points[parentInsertionIndex]);
		if (p1 == null || p2 == null) {
			return;
		}
		const conv = store.get.coords.pointToPage;
		const midpoint = _.geom.midpoint(conv(p1), conv(p2));
		const pageMidpoint = store.get.coords.pageToItem(midpoint, p1.relativeTo);
		store.mutations.item.add<PointItem>({
			item: {
				type: 'point', id: -1, parent: arrowItem,
				relativeTo: p1.relativeTo, ...pageMidpoint,
			},
			parent: arrowItem,
			parentInsertionIndex,
		});
	},
	rotateTip({arrow, direction}) {
		const item = store.get.calloutArrow(arrow);
		if (item != null) {
			item.direction = direction;
		}
	},
};
