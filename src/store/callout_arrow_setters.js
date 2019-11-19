/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';

export default {
	add({parent}) {
		const arrow = store.mutations.item.add({item: {
			type: 'calloutArrow', points: [], direction: 'right',
		}, parent});

		store.mutations.item.add({item: {
			type: 'point', x: 0, y: 0,
		}, parent: arrow});

		store.mutations.item.add({item: {
			type: 'point', x: 0, y: 0,
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
		const parentInsertionIndex = Math.ceil(arrowItem.points.length / 2);
		const p1 = store.get.point(arrowItem.points[parentInsertionIndex - 1]);
		const p2 = store.get.point(arrowItem.points[parentInsertionIndex]);
		const conv = store.get.coords.pointToPage;
		let midpoint = _.geom.midpoint(conv(p1), conv(p2));
		midpoint = store.get.coords.pageToItem(midpoint, p1.relativeTo);
		store.mutations.item.add({
			item: {type: 'point', relativeTo: p1.relativeTo, ...midpoint},
			parent: arrowItem,
			parentInsertionIndex,
		});
	},
	rotateTip({arrow, direction}) {
		store.get.lookupToItem(arrow).direction = direction;
	},
};
