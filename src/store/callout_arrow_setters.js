/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';

export default {
	add(opts) {  // opts: {parent}
		const arrow = store.mutations.item.add({item: {
			type: 'calloutArrow', points: [], direction: 'right'
		}, parent: opts.parent});

		store.mutations.item.add({item: {
			type: 'point', x: 0, y: 0
		}, parent: arrow});

		store.mutations.item.add({item: {
			type: 'point', x: 0, y: 0
		}, parent: arrow});

		return arrow;
	},
	delete(opts) {  // opts: {calloutArrow}
		const item = opts.calloutArrow;
		store.mutations.item.deleteChildList({item, listType: 'point'});
		store.mutations.item.delete({item});
	},
	addPoint(opts) { // opts: {arrow, doLayout}
		const arrow = store.get.lookupToItem(opts.arrow);
		const parentInsertionIndex = Math.ceil(arrow.points.length / 2);
		const p1 = store.get.point(arrow.points[parentInsertionIndex - 1]);
		const p2 = store.get.point(arrow.points[parentInsertionIndex]);
		const conv = store.get.coords.pointToPage;
		let midpoint = _.geom.midpoint(conv(p1), conv(p2));
		midpoint = store.get.coords.pageToItem(midpoint, p1.relativeTo);
		store.mutations.item.add({
			item: {type: 'point', relativeTo: p1.relativeTo, ...midpoint},
			parent: arrow,
			parentInsertionIndex
		});
	},
	rotateTip(opts) {  // opts: {arrow, direction}
		store.get.lookupToItem(opts.arrow).direction = opts.direction;
	}
};
