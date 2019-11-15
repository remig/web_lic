/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from '../util';
import store from '../store';
import cache from '../cache';
import Layout from '../layout';

export default {
	add(opts) {  // opts: {annotationType, properties, parent, x, y}

		const annotation = store.mutations.item.add({item: {
			type: 'annotation',
			annotationType: opts.annotationType,
		}, parent: opts.parent});

		_.assign(annotation, opts.properties);

		// Guarantee some nice defaults
		if (annotation.annotationType === 'label') {
			annotation.text = annotation.text || 'Label';
			annotation.font = annotation.font || '20pt Helvetica';
			annotation.color = annotation.color || 'black';
			annotation.align = 'left';
			annotation.valign = 'top';
			annotation.x = opts.x;
			annotation.y = opts.y;
			if (opts.properties.text) {
				Layout.label(annotation);
			}
		} else if (annotation.annotationType === 'arrow') {
			annotation.points = [];
			store.mutations.item.add({item: {
				type: 'point', x: opts.x, y: opts.y,
			}, parent: annotation});

			store.mutations.item.add({item: {
				type: 'point', x: opts.x + 100, y: opts.y,
			}, parent: annotation});
		} else {
			// image annotation width & height set by image load logic during first draw
			annotation.x = opts.x;
			annotation.y = opts.y;
		}
		return annotation;
	},
	set(opts) {  // opts: {annotation, newProperties}
		const annotation = store.get.lookupToItem(opts.annotation);
		const props = opts.newProperties || {};
		if (annotation.annotationType === 'label') {
			annotation.text = (props.text == null) ? annotation.text : props.text;
			annotation.color = (props.color == null) ? annotation.color : props.color;
			annotation.font = (props.font == null) ? annotation.font : props.font;
			Layout.label(annotation);
		}
	},
	delete(opts) {  // opts: {annotation}
		const item = store.get.lookupToItem(opts.annotation);
		if (item.hasOwnProperty('points')) {
			store.mutations.item.deleteChildList({item, listType: 'point'});
		}
		cache.clear(item);  // Clear cached images, if any
		store.mutations.item.delete({item});
	},
};
